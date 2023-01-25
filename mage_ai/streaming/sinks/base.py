from abc import ABC, abstractmethod
from typing import Dict


class BaseSink(ABC):
    config_class = None

    def __init__(self, config: Dict):
        if self.config_class is not None:
            if 'connector_type' in config:
                config.pop('connector_type')
            self.config = self.config_class.load(config=config)
        self.init_client()

    def init_client():
        pass

    @abstractmethod
    def write(self, data):
        pass

    @abstractmethod
    def batch_write(self, data):
        pass

    def test_connection(self):
        return True

    def _print(self, msg):
        print(f'[{self.__class__.__name__}] {msg}')
