from abc import ABC, abstractmethod
from typing import Dict


class BaseSource(ABC):
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
    def read(self):
        pass

    @abstractmethod
    def batch_read(self):
        pass

    def test_connection(self):
        return True
