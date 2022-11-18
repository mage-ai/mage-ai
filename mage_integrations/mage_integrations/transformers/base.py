from datetime import datetime
from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.constants import KEY_VALUE
from mage_integrations.sources.constants import BATCH_FETCH_LIMIT
from mage_integrations.sources.base import Source
from mage_integrations.transformers.utils import (
    convert_data_type,
    infer_dtypes,
    write_parquet_file,
)
from mage_integrations.utils.logger import Logger
from typing import Dict, Generator, List

import argparse
import os
import pandas as pd
import singer
import sys
import traceback

LOGGER = singer.get_logger()


class Transformer(Source, Destination):
    def __init__(
        self,
        argument_parser=None,
        batch_processing: bool = False,
        df_file_path: str = None,
        log_to_stdout: bool = False,
        logger=LOGGER,
        state_file_path: str = None,
        to_df: bool = False,
    ):
        super().__init__()
        if argument_parser:
            argument_parser.add_argument('--log_to_stdout', type=bool, default=False)
            argument_parser.add_argument('--df_file_path', type=str, default=None)
            argument_parser.add_argument('--to_df', type=bool, default=None)
            args, _ = argument_parser.parse_known_args()

            if args.log_to_stdout:
                log_to_stdout = args.log_to_stdout
            if args.df_file_path:
                df_file_path = args.df_file_path
            if args.to_df:
                to_df = args.to_df

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

        self.df_file_path = df_file_path
        self.to_df = to_df
        self.df = None

        if self.df_file_path:
            try:
                self.df = pd.read_parquet(self.df_file_path, engine='pyarrow')
            except Exception:
                self.df = pd.DataFrame()

    def process_schema(
        self,
        stream: str,
        schema: Dict,
        row: Dict,
        tags: Dict = dict(),
    ) -> None:
        super().process_schema(stream, schema, row, tags)
        self.columns = list(schema['properties'].keys())

    def process_state(self, row: Dict, tags: Dict = dict()) -> None:
        state = row.get(KEY_VALUE)
        if state:
            self._emit_state(state)
        else:
            message = 'A state message is missing a state value.'
            self.logger.exception(message, tags=tags)
            raise Exception(message)

    def process_record(
        self,
        stream: str,
        schema: Dict,
        row: Dict,
        tags: Dict = {},
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

    def transform_input(self, input_buffer) -> pd.DataFrame:
        self.data = []
        self.columns = None
        try:
            self._process(input_buffer)

            df = pd.DataFrame(data=self.data, columns=self.columns)

            if os.path.exists(self.df_file_path):
                os.remove(self.df_file_path)

            # Create directory if not exists
            df_dir_path = os.path.dirname(self.df_file_path)
            os.makedirs(df_dir_path, exist_ok=True)

            write_parquet_file(self.df_file_path, df)
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
    ) -> Generator[List[Dict], None, None]:
        records = self.df.to_dict('records')
        current = 0
        while current < len(records):
            yield records[current : current + BATCH_FETCH_LIMIT]

            current = current + BATCH_FETCH_LIMIT

    def process(self, input_buffer) -> None:
        try:
            if self.to_df:
                self.transform_input(input_buffer)
            else:
                catalog = self.catalog or self.discover(streams=self.selected_streams)
                dtypes = {
                    k: dict(type=['null', convert_data_type(v)])
                    for k, v in infer_dtypes(self.df).items()
                }

                self.sync(catalog, dtypes)
        except Exception as err:
            message = f'{self.__class__.__name__} process failed with error {str(err)}.'
            self.logger.exception(message, tags=dict(
                error=str(err),
                errors=traceback.format_stack(),
                message=traceback.format_exc(),
            ))
            raise Exception(message)


if __name__ == '__main__':
    transformer = Transformer(argument_parser=argparse.ArgumentParser())
    transformer.process(sys.stdin.buffer)
