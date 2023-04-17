from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, List
import json
import os
import traceback


class BaseSink(ABC):
    config_class = None

    def __init__(self, config: Dict, **kwargs):
        if self.config_class is not None:
            if 'connector_type' in config:
                config.pop('connector_type')
            self.config = self.config_class.load(config=config)
        self.buffer_path = kwargs.get('buffer_path')
        self.buffer = self.read_buffer() or []
        self.buffer_start_time = None
        self.init_client()

    def init_client(self):
        pass

    @abstractmethod
    def write(self, data: Dict):
        pass

    @abstractmethod
    def batch_write(self, data: List[Dict]):
        pass

    def clear_buffer(self):
        self.buffer = []
        if not self.buffer_path:
            return
        with open(self.buffer_path, 'w'):
            pass

    def has_buffer_timed_out(self, buffer_timeout_seconds):
        if self.buffer_start_time is None:
            return False
        if buffer_timeout_seconds <= 0:
            return False
        return (datetime.now(timezone.utc) -
                self.buffer_start_time).total_seconds() >= buffer_timeout_seconds

    def read_buffer(self):
        buffer = []
        if not self.buffer_path or not os.path.exists(self.buffer_path):
            return buffer
        try:
            with open(self.buffer_path) as fp:
                for line in fp:
                    buffer.append(json.loads(line))
        except Exception:
            traceback.print_exc()
            pass
        return buffer

    def test_connection(self):
        return True

    def write_buffer(self, data: List[Dict]):
        if not data:
            return
        if not self.buffer:
            self.buffer_start_time = datetime.now(timezone.utc)
        self.buffer += data
        if not self.buffer_path or not data:
            return
        with open(self.buffer_path, 'a') as fp:
            for record in data:
                fp.write(json.dumps(record) + '\n')

    def _print(self, msg):
        print(f'[{self.__class__.__name__}] {msg}')
