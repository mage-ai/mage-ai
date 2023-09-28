from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink
from typing import Dict, List
import time


@dataclass
class DummyConfig(BaseConfig):
    print_msg: bool = True


class DummySink(BaseSink):
    config_class = DummyConfig

    def write(self, data: Dict):
        if self.config.print_msg:
            self._print(f'Ingest data {data}, time={time.time()}')

    def batch_write(self, data: List[Dict]):
        if not data:
            return
        if self.config.print_msg:
            self._print(f'Batch ingest {len(data)} records, time={time.time()}. Sample: {data[0]}')
