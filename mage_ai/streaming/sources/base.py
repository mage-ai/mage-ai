from abc import ABC, abstractmethod
from typing import Dict
import json


class BaseSource(ABC):
    config_class = None

    def __init__(self, config: Dict, **kwargs):
        if self.config_class is not None:
            if 'connector_type' in config:
                config.pop('connector_type')
            self.config = self.config_class.load(config=config)
        self.checkpoint_path = kwargs.get('checkpoint_path')
        self.checkpoint = self.read_checkpoint()
        self.init_client()

    def init_client():
        pass

    @abstractmethod
    def read(self):
        pass

    @abstractmethod
    def batch_read(self):
        pass

    def read_checkpoint(self):
        checkpoint = None
        if self.checkpoint_path is None:
            return None
        try:
            with open(self.checkpoint_path) as fp:
                checkpoint = json.load(fp)
        except Exception:
            pass
        return checkpoint

    def update_checkpoint(self):
        if self.checkpoint_path is None or self.checkpoint is None:
            return
        try:
            with open(self.checkpoint_path, 'w') as fp:
                json.dump(self.checkpoint, fp)
        except Exception:
            pass

    def test_connection(self):
        return True

    def _print(self, msg):
        print(f'[{self.__class__.__name__}] {msg}')
