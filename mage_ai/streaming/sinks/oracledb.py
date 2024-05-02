import json
import time
from dataclasses import dataclass
from typing import Dict, List

import pandas as pd

from mage_ai.io.base import ExportWritePolicy
from mage_ai.io.oracledb import OracleDB
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class OracleDbConfig(BaseConfig):
    user: str
    password: int
    host: str
    port: int
    table: str
    service_name: str
    verbose: bool = False
    mode: str = 'thin'


class OracleDbSink(BaseSink):
    config_class = OracleDbConfig

    def init_client(self):
        self.oracledb_client = OracleDB(
            user=self.config.user,
            password=self.config.password,
            host=self.config.host,
            port=self.config.port,
            service_name=self.config.service_name,
            verbose=self.config.verbose,
            mode=self.config.mode,
        )
        self.oracledb_client.open()

    def write(self, message: Dict):
        self.batch_write([message])

    def batch_write(self, messages: List[Dict]):
        if not messages:
            return
        self._print(
            f'Batch ingest {len(messages)} records, time={time.time()}. Sample: {messages[0]}')
        # Convert string formated dictionary array to array of dictionaries.
        # To be used for dataframe creation.
        dictionary_messages = [json.loads(doc_string) for doc_string in messages]
        df = pd.DataFrame(dictionary_messages)
        self.oracledb_client.export(
            df,
            self.config.table,
            if_exists=ExportWritePolicy.APPEND,
        )
