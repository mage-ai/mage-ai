from jsonschema.validators import Draft4Validator
from mage_integrations.destinations.constants import (
    KEY_BOOKMARK_PROPERTIES,
    KEY_KEY_PROPERTIES,
    KEY_RECORD,
    KEY_REPLICATION_METHOD,
    KEY_SCHEMA,
    KEY_STREAM,
    KEY_TYPE,
    KEY_UNIQUE_CONFLICT_METHOD,
    KEY_UNIQUE_CONSTRAINTS,
    KEY_VALUE,
    TYPE_RECORD,
    TYPE_SCHEMA,
    TYPE_STATE,
)
from mage_integrations.destinations.utils import flatten_record
from mage_integrations.utils.dictionary import merge_dict
from mage_integrations.utils.files import get_abs_path
from mage_integrations.utils.logger import Logger
from os.path import isfile
from typing import Dict, List
import inspect
import io
import json
import os
import singer
import sys
import yaml

LOGGER = singer.get_logger()


class Destination():
    def __init__(self,
        argument_parser = None,
        batch_processing: bool = False,
        config: Dict = None,
        config_file_path: str = None,
        logger = LOGGER,
        settings: Dict = None,
        settings_file_path: str = None,
        state_file_path: str = None,
    ):
        if argument_parser:
            argument_parser.add_argument('--config', type=str, default=None)
            argument_parser.add_argument('--settings', type=str, default=None)
            argument_parser.add_argument('--state', type=str, default=None)
            args = argument_parser.parse_args()

            if args.config:
                config_file_path = args.config
            if args.settings:
                settings_file_path = args.settings
            if args.state:
                state_file_path = args.state

        self._config = config
        self._settings = settings
        self.bookmark_properties = None
        self.config_file_path = config_file_path
        self.key_properties = None
        self.logger = Logger(caller=self, logger=logger)
        self.batch_processing = batch_processing
        self.replication_methods = None
        self.schemas = None
        self.settings_file_path = settings_file_path
        self.state_file_path = state_file_path
        self.unique_conflict_methods = None
        self.unique_constraints = None
        self.validators = None

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

    @property
    def settings(self) -> Dict:
        if self._settings:
            return self._settings
        elif self.settings_file_path:
            with open(self.settings_file_path) as f:
                return yaml.safe_load(f.read())

        return {}

    def export_data(
        self,
        stream: str,
        schema: dict,
        record: dict,
        tags: dict = {},
        **kwargs,
    ) -> None:
        raise Exception('Subclasses must implement the export_data method.')

    def export_batch_data(self, record_data: List[Dict]) -> None:
        raise Exception('Subclasses must implement the export_batch_data method.')

    def process_record(
        self,
        stream: str,
        schema: dict,
        row: dict,
        tags: dict = {},
    ) -> None:
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

    def process_record_data(self, record_data: List[Dict]) -> None:
        data = record_data[0]
        stream = data['stream']
        schema = data['schema']
        tags = data['tags']

        batch_data = [dict(
            record=self.__validate_and_prepare_record(**rd),
            schema=schema,
            stream=stream,
            tags=tags,
        ) for rd in record_data]

        if len(batch_data) >= 1:
            self.export_batch_data(batch_data)

    def process_schema(
        self,
        stream: str,
        schema: dict,
        row: dict,
        tags: dict = {},
    ) -> None:
        if not stream:
            message = f'Required key {KEY_STREAM} is missing from row.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

        self.bookmark_properties[stream] = row.get(KEY_BOOKMARK_PROPERTIES)
        self.key_properties[stream] = row.get(KEY_KEY_PROPERTIES)
        self.replication_methods[stream] = row.get(KEY_REPLICATION_METHOD)
        self.schemas[stream] = schema
        self.unique_conflict_methods[stream] = row.get(KEY_UNIQUE_CONFLICT_METHOD)
        self.unique_constraints[stream] = row.get(KEY_UNIQUE_CONSTRAINTS)
        self.validators[stream] = Draft4Validator(schema)

    def process_state(self, row: dict, tags: dict = {}) -> None:
        state = row.get(KEY_VALUE)
        if state:
            self.logger.info(f'Setting state to {state}.', tags=tags)
            self.__emit_state(state)
        else:
            message = f'A state message is missing a state value.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

    def process(self, input_buffer) -> None:
        self.bookmark_properties = {}
        self.key_properties = {}
        self.replication_methods = {}
        self.schemas = {}
        self.unique_conflict_methods = {}
        self.unique_constraints = {}
        self.validators = {}

        batches_by_stream = {}

        text_input = io.TextIOWrapper(input_buffer, encoding='utf-8')
        for idx, line in enumerate(text_input):
            tags = dict(index=idx)

            try:
                row = json.loads(line)
            except json.decoder.JSONDecodeError as err:
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
            schema = self.schemas.get(stream)
            if stream:
                tags.update(stream=stream)

            if not batches_by_stream.get(stream):
                batches_by_stream[stream] = dict(
                    record_data=[],
                    state_data=[],
                )

            if TYPE_SCHEMA == row_type:
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

        for stream, batches in batches_by_stream.items():
            record_data = batches['record_data']
            if len(record_data) >= 1:
                self.process_record_data(record_data)

            states = batches['state_data']
            for state in states:
                self.process_state(**state)

    def __emit_state(self, state):
        if state:
            line = json.dumps(state)
            text = f'{line}\n'
            if self.state_file_path:
                with open(self.state_file_path, 'w') as f:
                    f.write(text)
            else:
                sys.stdout.write()
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

        self.validators[stream].validate(record)

        return flatten_record(record)
