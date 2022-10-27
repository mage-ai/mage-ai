import argparse
from datetime import datetime
from typing import Dict, List
from jsonschema.validators import Draft4Validator
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import VariableType
from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.constants import KEY_BOOKMARK_PROPERTIES, KEY_KEY_PROPERTIES, KEY_RECORD, KEY_REPLICATION_METHOD, KEY_SCHEMA, KEY_STREAM, KEY_TYPE, KEY_UNIQUE_CONFLICT_METHOD, KEY_UNIQUE_CONSTRAINTS, KEY_VALUE, KEY_VERSION
from mage_integrations.destinations.utils import flatten_record
from mage_integrations.sources.messages import write_records
from mage_integrations.sources.base import Source
from mage_integrations.utils.logger.constants import TYPE_ACTIVATE_VERSION, TYPE_LOG, TYPE_RECORD, TYPE_SCHEMA, TYPE_STATE
from mage_integrations.utils.logger import Logger
from pandas import DataFrame

import io
import json
import singer
import sys
import traceback

LOGGER = singer.get_logger()


class Transformer(Source):
    def __init__(
        self,
        argument_parser = None,
        batch_processing: bool = False,
        log_to_stdout: bool = False,
        logger = LOGGER,
        state_file_path: str = None,
        to_df: bool = False,
    ):
        super().__init__() 
        self.to_df = to_df
        if argument_parser:
            argument_parser.add_argument('--block_uuid', type=str, default=None)
            argument_parser.add_argument('--pipeline_uuid', type=str, default=None)
            argument_parser.add_argument('--execution_partition', type=str, default=None)
            argument_parser.add_argument('--log_to_stdout', type=bool, default=False)
            argument_parser.add_argument('--to_df', type=bool, default=False)
            args, unknown = argument_parser.parse_known_args()

            if args.block_uuid:
                self.block_uuid = args.block_uuid
            if args.pipeline_uuid:
                self.pipeline_uuid = args.pipeline_uuid
            if args.execution_partition:
                self.execution_partition = args.execution_partition
            if args.log_to_stdout:
                log_to_stdout = args.log_to_stdout
            if args.to_df:
                self.to_df = args.to_df

        self.bookmark_properties = None
        self.key_properties = None
        self.logger = Logger(caller=self, log_to_stdout=log_to_stdout, logger=logger)
        self.batch_processing = batch_processing
        self.replication_methods = None
        self.schemas = None
        self.state_file_path = state_file_path
        self.unique_conflict_methods = None
        self.unique_constraints = None
        self.validators = None
        self.versions = None

    def process_schema(
        self,
        stream: str,
        schema: dict,
        row: dict,
        tags: dict = {},
    ) -> None:
        self.logger.info(f'schema: {schema}')
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
            self.__emit_state(state)
        else:
            message = 'A state message is missing a state value.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

    def process_record(
        self,
        stream: str,
        schema: dict,
        row: dict,
        tags: dict = {},
    ) -> List:
        record = self.__validate_and_prepare_record(
            stream=stream,
            schema=schema,
            row=row,
            tags=tags,
        )

        columns = list(schema['properties'].keys())

        vals = []
        for column in columns:
            vals.append(record.get(column, None))

        return vals

    def process_record_data(self, record_data: List[Dict], stream: str):
        return [self.process_record(**rd) for rd in record_data]

    def transform_input(self, input_buffer) -> DataFrame:
        try:
            self.bookmark_properties = {}
            self.key_properties = {}
            self.replication_methods = {}
            self.schemas = {}
            self.unique_conflict_methods = {}
            self.unique_constraints = {}
            self.validators = {}
            self.versions = {}
            batches_by_stream = {}

            text_input = io.TextIOWrapper(input_buffer, encoding='utf-8')
            data = []
            columns = None
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
                schema = self.schemas.get(stream)
                if schema:
                    columns = list(schema['properties'].keys())
                if stream:
                    tags.update(stream=stream)

                if not batches_by_stream.get(stream):
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
                        data.append(self.process_record(**record_data))
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
                    data.extend(self.process_record_data(record_data, stream))

                states = batches['state_data']
                for state in states:
                    self.process_state(**state)

            df = DataFrame(data=data, columns=columns)

            pipeline = Pipeline(self.pipeline_uuid)
            block = pipeline.get_block(self.block_uuid)

            block.store_variables(
                dict(df=df),
                self.execution_partition,
                override_outputs=True,
            )
        except Exception as err:
            message = f'{self.__class__.__name__} process failed with error {err}.'
            self.logger.exception(message, tags=dict(
                error=str(err),
                errors=traceback.format_stack(),
                message=traceback.format_exc(),
            ))
            raise Exception(message)

    def load_data(
        self,
        bookmarks: Dict = None,
        query: Dict = {},
        start_date: datetime = None,
        **kwargs,
    ):
        pipeline = Pipeline(self.pipeline_uuid)
        df = pipeline.variable_manager.get_variable(
            pipeline.uuid,
            self.block_uuid,
            'df',
            partition=self.execution_partition,
            variable_type=VariableType.DATAFRAME,
        )
        return df.to_dict('records')

    def process(self, input_buffer) -> None:
        if self.to_df:
            self.transform_input(input_buffer)
        else:
            catalog = self.catalog or self.discover(streams=self.selected_streams)
            self.sync(catalog)

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

if __name__ == '__main__':
    transformer = Transformer(argument_parser=argparse.ArgumentParser())
    transformer.process(sys.stdin.buffer)
