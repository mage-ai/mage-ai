import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List

import pandas as pd
import pyarrow as pa
from deltalake.writer import write_deltalake

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class AzureDataLakeConfig(BaseConfig):
    table_uri: str
    account_name: str
    access_key: str
    mode: str = 'append'
    file_type: str = 'delta'


class AzureDataLakeSink(BaseSink):
    config_class = AzureDataLakeConfig

    def write(self, data: Dict):
        self._print(f'Ingest data {data}, time={time.time()}')
        self.write_buffer(data)

    def batch_write(self, data: List[Dict]):
        if not data:
            self._print('No data')
            return
        self._print(f'Batch ingest {len(data)} records, time={time.time()}. \
                      Sample: {data[0]}')
        self.write_buffer(data)

        self.upload_data_to_adls()

    def upload_data_to_adls(self):
        if not self.buffer:
            return
        self._print(f'Upload {len(self.buffer)} records to DeltaTable.')

        df = pd.DataFrame(self.buffer)

        if self.config.file_type == 'delta':
            curr_time = datetime.now(timezone.utc)
            filename = curr_time.strftime('%Y%m%d-%H%M%S')
            try:
                storage_options = {
                    'azure_storage_account_name': self.config.account_name,
                    'azure_storage_access_key': self.config.access_key}

                data = pa.Table.from_pandas(df)

                write_deltalake(table_or_uri=self.config.table_uri,
                                data=data,
                                name=filename,
                                mode=self.config.mode,
                                storage_options=storage_options)

                self._print(f'Data written to {self.config.table_uri}')
            except Exception as e:
                self.clear_buffer()
                raise Exception(e)
        else:
            self.clear_buffer()
            raise Exception(f'File type {self.config.file_type} \
                              is not supported.')

        self.clear_buffer()
