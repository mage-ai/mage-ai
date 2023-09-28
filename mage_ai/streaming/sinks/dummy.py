import time
from dataclasses import dataclass
from typing import Dict, List

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class DummyConfig(BaseConfig):
    print_msg: bool = True


class DummySink(BaseSink):
    config_class = DummyConfig

    def init_client(self):
        pass

    def write(self, message: Dict):
        if self.config.print_msg:
            self._print(f'Ingest data {message}, time={time.time()}')

    def batch_write(self, messages: List[Dict]):
        if not messages:
            return
        if self.config.print_msg:
            self._print(
                f'Batch ingest {len(messages)} records, time={time.time()}. Sample: {messages[0]}')
