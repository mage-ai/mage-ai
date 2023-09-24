import time
import traceback
from dataclasses import dataclass, field
from typing import Dict, List

import pandas as pd

from mage_ai.io.base import ExportWritePolicy
from mage_ai.io.constants import UNIQUE_CONFLICT_METHOD_IGNORE
from mage_ai.io.postgres import Postgres
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class PostgresConfig(BaseConfig):
    database: str
    host: str
    password: str
    schema: str
    table: str
    username: str
    port: int = 5432
    unique_conflict_method: str = UNIQUE_CONFLICT_METHOD_IGNORE
    unique_constraints: List = field(default_factory=list)


class PostgresSink(BaseSink):
    config_class = PostgresConfig

    def init_client(self):
        # Initialize postgres connection
        self.postgres_client = Postgres(
            dbname=self.config.database,
            user=self.config.username,
            password=self.config.password,
            host=self.config.host,
            port=self.config.port,
            schema=self.config.schema,
        )
        self.postgres_client.open()

    def write(self, data: Dict):
        self.batch_write([data])

    def batch_write(self, data: List[Dict]):
        self._print(f'Batch ingest {len(data)} records, time={time.time()}. Sample: {data[0]}')

        df = pd.DataFrame.from_records(data)
        self.postgres_client.export(
            df,
            self.config.schema,
            self.config.table,
            if_exists=ExportWritePolicy.APPEND,
            unique_conflict_method=self.config.unique_conflict_method,
            unique_constraints=self.config.unique_constraints,
        )

    def destroy(self):
        try:
            self.postgres_client.close()
        except Exception:
            traceback.print_exc()
