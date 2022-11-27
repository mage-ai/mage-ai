from jsonschema.validators import Draft4Validator
from mage_integrations.destinations.constants import (
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_OBJECT,
    KEY_BOOKMARK_PROPERTIES,
    KEY_DISABLE_COLUMN_TYPE_CHECK,
    KEY_KEY_PROPERTIES,
    KEY_PARTITION_KEYS,
    KEY_RECORD,
    KEY_REPLICATION_METHOD,
    KEY_SCHEMA,
    KEY_STREAM,
    KEY_TYPE,
    KEY_UNIQUE_CONFLICT_METHOD,
    KEY_UNIQUE_CONSTRAINTS,
    KEY_VALUE,
    KEY_VERSION,
)
from mage_integrations.destinations.utils import flatten_record
from mage_integrations.utils.dictionary import merge_dict
from mage_integrations.utils.files import get_abs_path
from mage_integrations.utils.logger import Logger
from mage_integrations.utils.logger.constants import (
    TYPE_ACTIVATE_VERSION,
    TYPE_LOG,
    TYPE_RECORD,
    TYPE_SCHEMA,
    TYPE_STATE,
)
from os.path import isfile
from typing import Dict, List
import ast
import inspect
import io
import json
import os
import singer
import sys
import traceback
import yaml

LOGGER = singer.get_logger()


class Destination():
    def __init__(
        self,
        argument_parser=None,
        batch_processing: bool = False,
        config: Dict = None,
        config_file_path: str = None,
        debug: bool = False,
        log_to_stdout: bool = False,
        logger=LOGGER,
        settings: Dict = None,
        settings_file_path: str = None,
        state_file_path: str = None,
        test_connection: bool = False,
    ):
        if argument_parser:
            argument_parser.add_argument('--config', type=str, default=None)
            argument_parser.add_argument('--config_json', type=str, default=None)
            argument_parser.add_argument('--debug', action='store_true')
            argument_parser.add_argument('--log_to_stdout', type=bool, default=False)
            argument_parser.add_argument('--settings', type=str, default=None)
            argument_parser.add_argument('--state', type=str, default=None)
            argument_parser.add_argument('--test_connection', action='store_true')
            args = argument_parser.parse_args()

            if args.config:
                config_file_path = args.config
            if args.config_json:
                config = json.loads(args.config_json)
            if args.debug:
                debug = args.debug
            if args.log_to_stdout:
                log_to_stdout = args.log_to_stdout
            if args.settings:
                settings_file_path = args.settings
            if args.state:
                state_file_path = args.state
            if args.test_connection:
                test_connection = args.test_connection

        self.config = config
        self.settings = settings
        self.batch_processing = batch_processing
        self.bookmark_properties = None
        self.config_file_path = config_file_path
        self.debug = debug
        self.disable_column_type_check = None
        self.key_properties = None
        self.logger = Logger(caller=self, log_to_stdout=log_to_stdout, logger=logger)
        self.partition_keys = None
        self.replication_methods = None
        self.schemas = None
        self.settings_file_path = settings_file_path
        self.state_file_path = state_file_path
        self.should_test_connection = test_connection
        self.unique_conflict_methods = None
        self.unique_constraints = None
        self.validators = None
        self.versions = None

    @classmethod
    def templates(self) -> List[Dict]:
        parts = inspect.getfile(self).split('/')
        absolute_path = get_abs_path(f"{'/'.join(parts[:len(parts) - 1])}/templates")

        templates = {}
        for filename in os.listdir(absolute_path):
            path = absolute_path + '/' + filename
            if isfile(path):
                file_raw = filename.replace('.json', '')
                with open(path) as file:
                    templates[file_raw] = json.load(file)

        return templates

    @property
    def config(self) -> Dict:
        if self._config:
            return self._config
        elif self.config_file_path:
            with open(self.config_file_path, 'r') as f:
                return json.load(f)
        elif self.settings.get('config'):
            return self.settings['config']
        else:
            message = 'Config and config file path is missing.'
            self.logger.exception(message)
            raise Exception(message)

    # The @config.setter and @settings.setter are not currently used by destinations
    # and destination subclasses. They are used by the transformer subclass.
    @config.setter
    def config(self, config):
        self._config = config

    @property
    def settings(self) -> Dict:
        if self._settings:
            return self._settings
        elif self.settings_file_path:
            with open(self.settings_file_path) as f:
                return yaml.safe_load(f.read())

        return {}

    @settings.setter
    def settings(self, settings):
        self._settings = settings

    def test_connection(self) -> None:
        raise Exception('Subclasses must implement the test_connection method.')

    def export_data(
        self,
        stream: str,
        schema: dict,
        record: dict,
        tags: dict = {},
        **kwargs,
    ) -> None:
        raise Exception('Subclasses must implement the export_data method.')

    def export_batch_data(self, record_data: List[Dict], stream: str) -> None:
        raise Exception('Subclasses must implement the export_batch_data method.')

    def process_record(
        self,
        stream: str,
        schema: Dict,
        row: Dict,
        tags: Dict = {},
    ) -> None:
        self.logger.info(f'{self.__class__.__name__} process record started.', tags=tags)

        self.export_data(
            record=self.__validate_and_prepare_record(
                stream=stream,
                schema=schema,
                row=row,
                tags=tags,
            ),
            schema=schema,
            stream=stream,
            tags=tags,
        )

        self.logger.info(f'{self.__class__.__name__} process record completed.', tags=tags)

    def process_record_data(self, record_data: List[Dict], stream: str) -> None:
        batch_data = [dict(
            record=self.__validate_and_prepare_record(**rd),
            stream=stream,
        ) for rd in record_data]

        tags = dict(
            records=len(batch_data),
            stream=stream,
        )

        self.logger.info(
            f'{self.__class__.__name__} process record data for stream {stream} started.',
            tags=tags,
        )

        if len(batch_data) >= 1:
            self.export_batch_data(batch_data, stream)

            self.logger.info(
                f'{self.__class__.__name__} process record data for stream {stream} completed.',
                tags=tags,
            )
        else:
            self.logger.info(
                f'{self.__class__.__name__} process record data for stream {stream} empty.',
                tags=tags,
            )

    def process_schema(
        self,
        stream: str,
        schema: Dict,
        row: Dict,
        tags: Dict = dict(),
    ) -> None:
        if not stream:
            message = f'Required key {KEY_STREAM} is missing from row.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

        self.bookmark_properties[stream] = row.get(KEY_BOOKMARK_PROPERTIES)
        self.disable_column_type_check[stream] = row.get(KEY_DISABLE_COLUMN_TYPE_CHECK, False)
        self.key_properties[stream] = row.get(KEY_KEY_PROPERTIES)
        self.partition_keys[stream] = row.get(KEY_PARTITION_KEYS, [])
        self.replication_methods[stream] = row.get(KEY_REPLICATION_METHOD)
        self.schemas[stream] = schema
        self.unique_conflict_methods[stream] = row.get(KEY_UNIQUE_CONFLICT_METHOD)
        self.unique_constraints[stream] = row.get(KEY_UNIQUE_CONSTRAINTS)
        self.validators[stream] = Draft4Validator(schema)

    def process_state(self, row: Dict, tags: Dict = dict()) -> None:
        state = row.get(KEY_VALUE)
        if state:
            self._emit_state(state)
        else:
            message = f'A state message is missing a state value.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

    def process(self, input_buffer) -> None:
        class_name = self.__class__.__name__
        self.logger.info(f'{class_name} process started.')

        try:
            if self.should_test_connection:
                self.logger.info('Testing connection...')
                self.test_connection()
            else:
                self._process(input_buffer)
        except Exception as err:
            message = f'{class_name} process failed with error {err}.'
            self.logger.exception(message, tags=dict(
                error=str(err),
                errors=traceback.format_stack(),
                message=traceback.format_exc(),
            ))
            raise Exception(message)

        self.logger.info(f'{class_name} process completed.')

    def _process(self, input_buffer) -> None:
        self.bookmark_properties = {}
        self.disable_column_type_check = {}
        self.key_properties = {}
        self.partition_keys = {}
        self.replication_methods = {}
        self.schemas = {}
        self.unique_conflict_methods = {}
        self.unique_constraints = {}
        self.validators = {}
        self.versions = {}

        batches_by_stream = {}

        text_input = io.TextIOWrapper(input_buffer, encoding='utf-8')
        for line in text_input:
            tags = dict()

            try:
                row = json.loads(line)
            except json.decoder.JSONDecodeError:
                self.logger.info(f'Unable to parse: {line}', tags=tags)
                continue

            row_type = row.get(KEY_TYPE)
            if row_type:
                tags.update(row_type=row_type)
            elif row.get('level') and row.get('message'):
                logger = Logger(caller=row.get('caller'), logger=self.logger.logger)
                level = row['level']
                message = row['message']
                getattr(logger, level.lower())(message, tags=row.get('tags'))
                continue
            else:
                message = f'Required key {KEY_TYPE} is missing from row.'
                self.logger.exception(message, tags=tags)
                raise Exception(message)

            stream = row.get(KEY_STREAM)
            if TYPE_STATE == row_type:
                row_value = row['value']
                if row_value.get('current_stream'):
                    stream = row_value['current_stream']
                elif row_value.get('bookmarks'):
                    stream = list(row_value['bookmarks'].keys())[0]
                else:
                    stream = list(row_value.keys())[0]

            schema = self.schemas.get(stream)

            if stream:
                tags.update(stream=stream)

            if stream and not batches_by_stream.get(stream):
                batches_by_stream[stream] = dict(
                    record_data=[],
                    state_data=[],
                )

            if TYPE_ACTIVATE_VERSION == row_type:
                self.versions[stream] = row.get(KEY_VERSION)
            elif TYPE_LOG == row_type:
                continue
            elif TYPE_SCHEMA == row_type:
                schema = row.get(KEY_SCHEMA)
                tags.update(schema=schema)
                self.process_schema(stream, schema, row, tags=tags)
            elif TYPE_RECORD == row_type:
                record_data = dict(
                    row=row,
                    schema=schema,
                    stream=stream,
                    tags=tags,
                )

                if self.batch_processing:
                    batches_by_stream[stream]['record_data'].append(record_data)
                else:
                    self.process_record(**record_data)
            elif TYPE_STATE == row_type:
                state_data = dict(row=row, tags=tags)

                if self.batch_processing:
                    batches_by_stream[stream]['state_data'].append(state_data)
                else:
                    self.process_state(**state_data)
            else:
                message = f'Unknown message type {row_type} in message {row}.'
                self.logger.exception(message, tags=tags)
                raise Exception(message)

        errors = []
        stream_states = {}
        for stream, batches in batches_by_stream.items():
            record_data = batches['record_data']

            if len(record_data) >= 1:
                # If there is an error with a stream, catch error so that state can still
                # be persisted for previously successfully streams
                try:
                    self.process_record_data(record_data, stream)

                    states = batches['state_data']
                    if len(states) >= 1:
                        stream_states[stream] = states[-1]
                except Exception as err:
                    errors.append(err)

        if len(stream_states.values()) >= 1:
            bookmarks = {}
            for stream, state in stream_states.items():
                bookmarks.update(state['row'][KEY_VALUE]['bookmarks'])

            self.process_state(row={
                KEY_VALUE: dict(bookmarks=bookmarks),
            })

        for err in errors:
            raise err

    def _emit_state(self, state):
        if state:
            line = json.dumps(state)
            text = f'{line}\n'
            if self.state_file_path:
                with open(self.state_file_path, 'w') as f:
                    f.write(text)
            else:
                sys.stdout.write(text)
                sys.stdout.flush()

    def __validate_and_prepare_record(
        self,
        stream: str,
        schema: dict,
        row: dict,
        tags: dict = {},
    ) -> Dict:
        if not stream:
            message = f'Required key {KEY_STREAM} is missing from row.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

        if not schema:
            message = f'A record for stream {stream} was encountered before a corresponding schema.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

        record = row.get(KEY_RECORD)
        record_adjusted = record.copy()

        for k, v in record.items():
            prop_k = schema['properties'][k]
            prop_types = []

            if 'type' in prop_k:
                prop_types.append(prop_k['type'])

            if 'anyOf' in prop_k:
                for any_of in prop_k['anyOf']:
                    any_of_type = any_of['type']
                    if type(any_of_type) is list:
                        prop_types += any_of_type
                    else:
                        prop_types.append(any_of_type)

            if COLUMN_TYPE_ARRAY not in prop_types:
                continue

            v1 = record[k]
            if not v1:
                continue

            if type(v1) is list:
                items_dict = schema['properties'][k]['items']
                item_types = []

                if 'type' in items_dict:
                    item_types.append(items_dict['type'])

                if 'anyOf' in items_dict:
                    for any_of in items_dict['anyOf']:
                        any_of_type = any_of['type']
                        if type(any_of_type) is list:
                            item_types += any_of_type
                        else:
                            item_types.append(any_of_type)

                if COLUMN_TYPE_OBJECT in item_types:
                    record_adjusted[k] = [json.loads(s) if type(s) is str else s for s in v1]
            elif type(v1) is str:
                try:
                    record_adjusted[k] = json.loads(v1)
                except json.decoder.JSONDecodeError:
                    record_adjusted[k] = ast.literal_eval(v1)

        if not self.disable_column_type_check.get(stream, False):
            self.validators[stream].validate(record_adjusted)

        return flatten_record(record_adjusted)
