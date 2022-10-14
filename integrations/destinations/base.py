from destinations.constants import (
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
from destinations.utils import flatten_record
from jsonschema.validators import Draft4Validator
from utils.dictionary import merge_dict
from utils.logger import Logger
import io
import json
import singer
import sys

LOGGER = singer.get_logger()


class Destination():
    def __init__(self,
        argument_parser = None,
        config: dict = None,
        config_file_path: str = None,
        logger = LOGGER,
        state_file_path: str = None,
    ):
        if argument_parser:
            argument_parser.add_argument('--config', type=str, default=None)
            argument_parser.add_argument('--state', type=str, default=None)
            args = argument_parser.parse_args()
            if args.config:
                config_file_path = args.config
            if args.state:
                state_file_path = args.state

        self._config = config
        self.bookmark_properties = None
        self.config_file_path = config_file_path
        self.key_properties = None
        self.logger = Logger(caller=self, logger=logger)
        self.records_count = None
        self.replication_methods = None
        self.schemas = None
        self.state_file_path = state_file_path
        self.unique_conflict_methods = None
        self.unique_constraints = None
        self.validators = None

    @property
    def config(self):
        if self._config:
            return self._config
        elif self.config_file_path:
            with open(self.config_file_path, 'r') as f:
                return json.load(f)
        else:
            message = 'Config and config file path is missing.'
            self.logger.exception(message)
            raise Exception(message)

    def export_data(
        self,
        stream: str,
        schema: dict,
        record: dict,
        records_count: int,
        tags: dict = {},
        **kwargs,
    ) -> None:
        raise Exception('Subclasses must implement the export_data method.')

    def process_record(
        self,
        stream: str,
        schema: dict,
        row: dict,
        index: int,
        tags: dict = {},
    ) -> None:
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

        record = flatten_record(record)

        self.export_data(
            record=record,
            records_count=self.records_count,
            schema=schema,
            stream=stream,
            tags=tags,
        )
        self.records_count += 1

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
        self.records_count = 0
        self.replication_methods = {}
        self.schemas = {}
        self.unique_conflict_methods = {}
        self.unique_constraints = {}
        self.validators = {}

        text_input = io.TextIOWrapper(input_buffer, encoding='utf-8')
        for idx, line in enumerate(text_input):
            tags = dict(
                index=idx,
                line=line,
            )

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
            if schema:
                tags.update(schema=schema)
            if stream:
                tags.update(stream=stream)

            if TYPE_SCHEMA == row_type:
                schema = row.get(KEY_SCHEMA)
                tags.update(schema=schema)
                self.process_schema(stream, schema, row, tags=tags)
            elif TYPE_RECORD == row_type:
                self.process_record(
                    index=idx,
                    row=row,
                    schema=schema,
                    stream=stream,
                    tags=tags,
                )
            elif TYPE_STATE == row_type:
                self.process_state(row, tags=tags)
            else:
                message = f'Unknown message type {row_type} in message {row}.'
                self.logger.exception(message, tags=tags)
                raise Exception(message)

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
