import ast
import inspect
import io
import json
import os
import sys
import traceback
from abc import ABC, abstractmethod
from os.path import isfile
from typing import Dict, List

import singer
import yaml
from jsonschema.validators import Draft4Validator

from mage_integrations.destinations.constants import (
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    INTERNAL_COLUMN_SCHEMA,
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
    STREAM_OVERRIDE_SETTINGS_COLUMNS_KEY,
    STREAM_OVERRIDE_SETTINGS_KEY,
    STREAM_OVERRIDE_SETTINGS_PARTITION_KEYS_KEY,
)
from mage_integrations.utils.dictionary import extract, merge_dict
from mage_integrations.utils.files import get_abs_path
from mage_integrations.utils.logger import Logger
from mage_integrations.utils.logger.constants import (
    TYPE_ACTIVATE_VERSION,
    TYPE_LOG,
    TYPE_RECORD,
    TYPE_SCHEMA,
    TYPE_STATE,
)

LOGGER = singer.get_logger()
MAXIMUM_BATCH_SIZE_MB = 100


class Destination(ABC):
    def __init__(
        self,
        argument_parser=None,
        batch_processing: bool = False,
        catalog: Dict = None,
        config: Dict = None,
        config_file_path: str = None,
        debug: bool = False,
        input_file_path: str = None,
        log_to_stdout: bool = False,
        logger=LOGGER,
        settings: Dict = None,
        settings_file_path: str = None,
        show_templates: bool = False,
        state_file_path: str = None,
        test_connection: bool = False,
    ):
        if argument_parser:
            argument_parser.add_argument('--catalog_json', type=str, default=None)
            argument_parser.add_argument('--config', type=str, default=None)
            argument_parser.add_argument('--config_json', type=str, default=None)
            argument_parser.add_argument('--debug', action='store_true')
            argument_parser.add_argument('--input_file_path', type=str, default=None)
            argument_parser.add_argument('--log_to_stdout', type=bool, default=False)
            argument_parser.add_argument('--settings', type=str, default=None)
            argument_parser.add_argument('--show_templates', action='store_true')
            argument_parser.add_argument('--state', type=str, default=None)
            argument_parser.add_argument('--test_connection', action='store_true')
            args = argument_parser.parse_args()

            if args.catalog_json:
                catalog = json.loads(args.catalog_json)
            if args.config:
                config_file_path = args.config
            if args.config_json:
                config = json.loads(args.config_json)
            if args.debug:
                debug = args.debug
            if args.input_file_path:
                input_file_path = args.input_file_path
            if args.log_to_stdout:
                log_to_stdout = args.log_to_stdout
            if args.settings:
                settings_file_path = args.settings
            if args.show_templates:
                show_templates = args.show_templates
            if args.state:
                state_file_path = args.state
            if args.test_connection:
                test_connection = args.test_connection

        self.catalog = catalog
        self.config = config
        self.settings = settings
        self.batch_processing = batch_processing
        self.bookmark_properties = None
        self.config_file_path = config_file_path
        self.debug = debug
        self.disable_column_type_check = None
        self.key_properties = None
        self.input_file_path = input_file_path
        self.logger = Logger(caller=self, log_to_stdout=log_to_stdout, logger=logger)
        self.partition_keys = None
        self.replication_methods = None
        self.schemas = None
        self.settings_file_path = settings_file_path
        self.state_file_path = state_file_path
        self.should_test_connection = test_connection
        self.show_templates = show_templates
        self.unique_conflict_methods = None
        self.unique_constraints = None
        self.validators = None
        self.versions = None

        self._streams_from_catalog = None

    @property
    def config(self) -> Dict:
        if self._config:
            return self._config
        elif self.config_file_path:
            with open(self.config_file_path, 'r') as f:
                self._config = json.load(f)
            return self._config
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
                self._settings = yaml.safe_load(f.read())
            return self._settings
        return {}

    @settings.setter
    def settings(self, settings):
        self._settings = settings

    @property
    def streams_from_catalog(self) -> Dict:
        if self._streams_from_catalog is not None:
            return self._streams_from_catalog

        self._streams_from_catalog = {}
        if self.catalog and self.catalog.get('streams'):
            for stream_dict in self.catalog.get('streams'):
                stream_id = stream_dict.get('tap_stream_id') or stream_dict.get('stream')
                self._streams_from_catalog[stream_id] = stream_dict

        return self._streams_from_catalog

    @property
    def streams_override_settings(self) -> Dict:
        return self.config.get(STREAM_OVERRIDE_SETTINGS_KEY, {})

    @abstractmethod
    def test_connection(self) -> None:
        raise NotImplementedError('Subclasses must implement the test_connection method.')

    def before_process(self) -> None:   # noqa: B027
        pass

    def after_process(self) -> None:    # noqa: B027
        pass

    def export_batch_data(self, record_data: List[Dict], stream: str, tags: Dict = None) -> None:
        raise NotImplementedError('Subclasses must implement the export_batch_data method.')

    def export_data(
        self,
        stream: str,
        schema: dict,
        record: dict,
        tags: dict = None,
        **kwargs,
    ) -> None:
        if not tags:
            tags = {}

        self.export_batch_data([dict(
            record=record,
            schema=schema,
            stream=stream,
            tags=tags,
        )], stream)

    def process_record(
        self,
        stream: str,
        schema: Dict,
        row: Dict,
        tags: Dict = None,
    ) -> None:
        if not tags:
            tags = {}

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

    def process_record_data(
        self,
        record_data: List[Dict],
        stream: str,
        tags: Dict = None,
    ) -> None:
        if tags is None:
            tags = {}

        batch_data = [dict(
            record=self.__validate_and_prepare_record(**rd),
            stream=stream,
        ) for rd in record_data]

        tags = merge_dict(
            tags,
            dict(
                records=len(batch_data),
                stream=stream,
            ),
        )

        self.logger.info(
            f'{self.__class__.__name__} process record data for stream {stream} started.',
            tags=tags,
        )

        if len(batch_data) >= 1:
            self.export_batch_data(
                batch_data,
                stream,
                tags=tags,
            )

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
        tags: Dict = None,
    ) -> None:
        if not stream:
            message = f'Required key {KEY_STREAM} is missing from row.'
            self.logger.exception(message, tags=tags or {})
            raise Exception(message)

        self.bookmark_properties[stream] = row.get(KEY_BOOKMARK_PROPERTIES)

        should_disable = row.get(KEY_DISABLE_COLUMN_TYPE_CHECK)
        self.disable_column_type_check[stream] = True if should_disable is None else should_disable

        self.key_properties[stream] = row.get(KEY_KEY_PROPERTIES)
        self.partition_keys[stream] = row.get(KEY_PARTITION_KEYS, [])
        self.replication_methods[stream] = row.get(KEY_REPLICATION_METHOD)
        self.schemas[stream] = schema
        # Add internal columns to schema
        schema['properties'] = merge_dict(schema['properties'], INTERNAL_COLUMN_SCHEMA)

        if STREAM_OVERRIDE_SETTINGS_COLUMNS_KEY in self.streams_override_settings:
            static_columns_schema = {}
            for k in self.streams_override_settings[STREAM_OVERRIDE_SETTINGS_COLUMNS_KEY].keys():
                static_columns_schema[k] = dict(type=[
                    COLUMN_TYPE_STRING,
                ])
            schema['properties'] = merge_dict(schema['properties'], static_columns_schema)

        if STREAM_OVERRIDE_SETTINGS_PARTITION_KEYS_KEY in self.streams_override_settings:
            self.partition_keys[stream] += self.streams_override_settings[
                STREAM_OVERRIDE_SETTINGS_PARTITION_KEYS_KEY]

        self.unique_conflict_methods[stream] = row.get(KEY_UNIQUE_CONFLICT_METHOD)
        self.unique_constraints[stream] = row.get(KEY_UNIQUE_CONSTRAINTS)
        self.validators[stream] = Draft4Validator(schema)

    def process_state(self, row: Dict, tags: Dict = None) -> None:
        if not tags:
            tags = {}

        state = row.get(KEY_VALUE)
        if state:
            self._emit_state(state)
        else:
            message = 'A state message is missing a state value.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

    def process(self, input_buffer) -> None:
        self.before_process()

        class_name = self.__class__.__name__
        self.logger.info(f'{class_name} process started.')

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

        try:
            if self.should_test_connection:
                self.logger.info('Testing connection...')
                self.test_connection()
            elif self.show_templates:
                json.dump(self.templates(), sys.stdout)
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

        self.after_process()

        self.logger.info(f'{class_name} process completed.')

    def remove_duplicate_rows(self, row_data: List[Dict], stream: str) -> List[Dict]:
        return row_data

    def _process(self, input_buffer) -> None:
        batch_number = 0
        batches_by_stream = {}
        final_record_data = None
        final_state_data = None
        current_byte_size = 0

        tags = dict()

        for line in self.__text_input(input_buffer):
            tags = dict()
            record_data = None

            try:
                row = json.loads(line)
            except json.decoder.JSONDecodeError:
                self.logger.info(f'Unable to parse: {line}', tags=tags)
                continue

            if not row:
                self.logger.info(f'No valid row data {row} for line: {line}', tags=tags)
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
                    bookmarks = row_value['bookmarks']
                    if 'currently_syncing' in row:
                        stream = row['currently_syncing']
                    else:
                        stream = list(bookmarks.keys())[0]
                elif row_value.keys():
                    stream = list(row_value.keys())[0]
                else:
                    continue

            if stream:
                tags.update(stream=stream)

            schema = None
            if stream not in self.schemas:
                if self.streams_from_catalog and stream in self.streams_from_catalog:
                    stream_settings = self.streams_from_catalog.get(stream)
                    schema = stream_settings.get('schema')
                    tags.update(schema=schema)
                    self.process_schema(stream, schema, stream_settings, tags=tags)

            if not schema:
                schema = self.schemas.get(stream)

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
                if not self.streams_from_catalog or stream not in self.streams_from_catalog:
                    schema = row.get(KEY_SCHEMA)
                    tags.update(schema=schema)
                    self.process_schema(stream, schema, row, tags=tags)
                elif self.streams_from_catalog and stream in self.streams_from_catalog:
                    self.logger.info(
                        f'Schema for stream {stream} already exists from catalog JSON.',
                        tags=tags,
                    )
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
                    final_record_data = record_data
            elif TYPE_STATE == row_type:
                state_data = dict(row=row, tags=tags)

                if self.batch_processing:
                    if 'value' in row and 'bookmarks' in row['value']:
                        arr = row['value']['bookmarks'].keys()
                    else:
                        arr = [stream]

                    for stream_inner in arr:
                        batches_by_stream[stream_inner]['state_data'].append(state_data)
                else:
                    self.process_state(**state_data)
                    final_state_data = state_data
            else:
                message = f'Unknown message type {row_type} in message {row}.'
                self.logger.exception(message, tags=tags)
                raise Exception(message)

            if self.batch_processing:
                if record_data:
                    current_byte_size += sys.getsizeof(json.dumps(record_data))

                    if current_byte_size >= self.config.get(
                            'maximum_batch_size_mb', MAXIMUM_BATCH_SIZE_MB) * 1024 * 1024:
                        self.__process_batch_set(
                            batches_by_stream,
                            final_record_data,
                            final_state_data,
                            tags=dict(
                                batch=batch_number,
                                batch_byte_size=current_byte_size,
                            ),
                        )
                        batches_by_stream = {}
                        final_record_data = None
                        final_state_data = None
                        current_byte_size = 0
                        batch_number += 1

        self.__process_batch_set(
            batches_by_stream,
            final_record_data,
            final_state_data,
            tags=merge_dict(tags, dict(batch=batch_number)),
        )

    def __process_batch_set(
        self,
        batches_by_stream: Dict,
        final_record_data: Dict = None,
        final_state_data: Dict = None,
        tags: Dict = None,
    ) -> None:
        if not tags:
            tags = {}

        self.logger.info('Process batch set started.', tags=tags)

        errors = []
        stream_bookmarks = {}
        for stream, batches in batches_by_stream.items():
            record_data = batches['record_data']

            if len(record_data) >= 1:
                record_data = self.remove_duplicate_rows(record_data, stream)

            if len(record_data) >= 1:
                # If there is an error with a stream, catch error so that state can still
                # be persisted for previously successfully streams
                try:
                    self.process_record_data(
                        record_data,
                        stream,
                        tags=tags,
                    )
                    final_record_data = record_data[-1]

                    states = batches['state_data']
                    if len(states) >= 1:
                        merged_bookmarks = dict()
                        # Merge the states record to one set of bookmarks
                        for state in states:
                            state_bookmarks = state['row'][KEY_VALUE]['bookmarks']
                            for k, v in state_bookmarks.items():
                                if k in merged_bookmarks and isinstance(v, dict) and \
                                        isinstance(merged_bookmarks[k], dict):
                                    merged_bookmarks[k] = merge_dict(merged_bookmarks[k], v)
                                else:
                                    merged_bookmarks[k] = v
                        stream_bookmarks[stream] = merged_bookmarks
                except Exception as err:
                    errors.append(err)

        if len(stream_bookmarks.values()) >= 1:
            bookmarks = {}
            for bookmark in stream_bookmarks.values():
                bookmarks.update(bookmark)
            state_data = dict(row={
                KEY_VALUE: dict(bookmarks=bookmarks),
            })
            self.process_state(**state_data)
            final_state_data = state_data

        if final_state_data:
            self.logger.info(
                'Final state for bookmark properties update completed.',
                tags=merge_dict(tags, dict(state=final_state_data['row'][KEY_VALUE])),
            )

        if final_record_data:
            record_adjusted = self.__prepare_record(**final_record_data)
            self.logger.info(
                'Final record processing completed.',
                tags=merge_dict(tags, dict(record=record_adjusted)),
            )

        for err in errors:
            raise err

        self.logger.info('Process batch set completed.', tags=tags)

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

    def __prepare_record(
        self,
        stream: str,
        schema: dict,
        row: dict,
        tags: dict = None,
    ) -> Dict:
        if not tags:
            tags = {}

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
        if self.streams_from_catalog and stream in self.streams_from_catalog:
            record_adjusted = extract(record_adjusted, schema['properties'].keys())

        for k in record.keys():
            if k not in schema['properties']:
                continue

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

            if type(v1) is list and schema['properties'][k].get('items'):
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

        if STREAM_OVERRIDE_SETTINGS_COLUMNS_KEY in self.streams_override_settings:
            for k, v in self.streams_override_settings[
                    STREAM_OVERRIDE_SETTINGS_COLUMNS_KEY].items():
                record_adjusted[k] = v

        return record_adjusted

    def __text_input(self, input_buffer):
        if self.input_file_path:
            file_size = os.path.getsize(self.input_file_path)
            self.logger.info(
                f'Reading {file_size} bytes from input file path {self.input_file_path}.',
            )

            with open(self.input_file_path) as f:
                for line in f:
                    yield line
        else:
            text_input = io.TextIOWrapper(input_buffer, encoding='utf-8')
            for line in text_input:
                yield line

    def __validate_and_prepare_record(
        self,
        stream: str,
        schema: dict,
        row: dict,
        tags: dict = None,
    ) -> Dict:
        record_adjusted = self.__prepare_record(stream, schema, row, tags or {})
        schema_properties = schema['properties']

        if not self.disable_column_type_check.get(stream, False):
            for col, value in record_adjusted.items():
                column_properties = schema_properties[col]
                column_types = column_properties.get('type', [])

                valid = False
                if COLUMN_TYPE_OBJECT in column_types:
                    valid = type(value) is dict or type(value) is list
                elif COLUMN_TYPE_ARRAY in column_types:
                    valid = type(value) is list

                if not valid:
                    self.validators[stream].validate({
                        col: value,
                    })

        return record_adjusted

    @classmethod
    def templates(cls) -> List[Dict]:
        parts = inspect.getfile(cls).split('/')
        absolute_path = get_abs_path(f"{'/'.join(parts[:len(parts) - 1])}/templates")

        templates = {}
        for filename in os.listdir(absolute_path):
            path = absolute_path + '/' + filename
            if isfile(path):
                file_raw = filename.replace('.json', '')
                with open(path) as file:
                    templates[file_raw] = json.load(file)

        return templates
