from datetime import datetime
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import VariableType
from mage_ai.io.export_utils import infer_dtypes
from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.constants import KEY_RECORD, KEY_STREAM, KEY_VALUE
from mage_integrations.destinations.utils import flatten_record
from mage_integrations.sources.base import Source
from mage_integrations.utils.logger import Logger
from pandas import DataFrame
from typing import Dict, List

import argparse
import json
import singer
import sys
import traceback

LOGGER = singer.get_logger()


class Transformer(Source, Destination):
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
        if argument_parser:
            argument_parser.add_argument('--block_uuid', type=str, default=None)
            argument_parser.add_argument('--pipeline_uuid', type=str, default=None)
            argument_parser.add_argument('--execution_partition', type=str, default=None)
            argument_parser.add_argument('--log_to_stdout', type=bool, default=False)
            argument_parser.add_argument('--to_df', type=bool, default=False)
            args, _ = argument_parser.parse_known_args()

            if args.block_uuid:
                self.block_uuid = args.block_uuid
            if args.pipeline_uuid:
                self.pipeline_uuid = args.pipeline_uuid
            if args.execution_partition:
                self.execution_partition = args.execution_partition
            if args.log_to_stdout:
                log_to_stdout = args.log_to_stdout
            if args.to_df:
                to_df = args.to_df

        self.to_df = to_df
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

        self.data = []
        self.columns = None

        pipeline = Pipeline(self.pipeline_uuid)
        self.df = pipeline.variable_manager.get_variable(
            pipeline.uuid,
            self.block_uuid,
            'df',
            partition=self.execution_partition,
            variable_type=VariableType.DATAFRAME,
        )

    def process_schema(
        self,
        stream: str,
        schema: dict,
        row: dict,
        tags: dict = {},
    ) -> None:
        super().process_schema(stream, schema, row, tags)
        self.columns = list(schema['properties'].keys())

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
    ) -> None:
        record = self._validate_and_prepare_record(
            stream=stream,
            schema=schema,
            row=row,
            tags=tags,
        )

        columns = list(schema['properties'].keys())

        vals = []
        for column in columns:
            vals.append(record.get(column, None))

        self.data.append(vals)

    def process_record_data(self, record_data: List[Dict], stream: str):
        self.data.extend([self.process_record(**rd) for rd in record_data])

    def transform_input(self, input_buffer) -> DataFrame:
        self.data = []
        self.columns = None
        try:
            self._process(input_buffer)

            df = DataFrame(data=self.data, columns=self.columns)

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
        return self.df.to_dict('records')

    def process(self, input_buffer) -> None:
        if self.to_df:
            self.transform_input(input_buffer)
        else:
            catalog = self.catalog or self.discover(streams=self.selected_streams)
            dtypes = {k: dict(type=[v]) for k, v in infer_dtypes(self.df).items()}

            self.sync(catalog, dtypes)

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

if __name__ == '__main__':
    transformer = Transformer(argument_parser=argparse.ArgumentParser())
    transformer.process(sys.stdin.buffer)
