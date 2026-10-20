import importlib
import os
import time
import traceback
from dataclasses import dataclass, field
from typing import Dict, List

import pandas as pd

from mage_ai.io.config import ConfigFileLoader
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.strings import classify
from mage_ai.streaming.constants import SinkType
from mage_ai.streaming.sinks.base import BaseSink

IO_CLASS_MAP = {
    SinkType.BIGQUERY: {
        'class_name': 'BigQuery',
    },
    SinkType.CLICKHOUSE: {
        'class_name': 'ClickHouse',
    },
    SinkType.DUCKDB: {
        'class_name': 'DuckDB',
    },
    SinkType.MYSQL: {
        'class_name': 'MySQL',
    },
    SinkType.MSSQL: {
        'class_name': 'MSSQL',
    },
}


@dataclass
class GenericIOConfig(BaseConfig):
    # profile in io_config.yaml
    profile: str = 'default'
    # Extra config used in export method
    config: Dict = field(default_factory=dict)


class GenericIOSink(BaseSink):
    config_class = GenericIOConfig

    def init_client(self):
        config_path = os.path.join(get_repo_path(), 'io_config.yaml')
        config_file_loader = ConfigFileLoader(config_path, self.config.profile)

        self.io_client = self.__io_class().with_config(config_file_loader)
        if hasattr(self.io_client, 'open') and callable(self.io_client.open):
            self.io_client.open()

    def write(self, message: Dict):
        self.batch_write([message])

    def batch_write(self, messages: List[Dict]):
        if not messages:
            return
        self._print(
            f'Batch ingest {len(messages)} records, time={time.time()}. Sample: {messages[0]}')

        formatted_messages = []
        for m in messages:
            if self._is_message_format_v2(m):
                formatted_messages.append(
                    merge_dict(m.get('data'), dict(metadata=m.get('metadata'))))
            else:
                formatted_messages.append(m)
        df = pd.DataFrame.from_records(formatted_messages)
        self.io_client.export(
            df,
            **merge_dict(dict(if_exists='append'), self.config.config),
        )

    def destroy(self):
        try:
            if hasattr(self.io_client, 'close') and callable(self.io_client.close):
                self.io_client.close()
        except Exception:
            traceback.print_exc()

    def __io_class(self):
        io_class_config = IO_CLASS_MAP.get(self.connector_type, {})
        return getattr(
            importlib.import_module(
                io_class_config.get('module_path', f'mage_ai.io.{self.connector_type}')),
            io_class_config.get('class_name', classify(self.connector_type)),
        )
