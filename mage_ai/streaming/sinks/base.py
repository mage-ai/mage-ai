import json
import os
import traceback
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, List

MESSAGE_FORMAT_V2_KEYS = frozenset(['data', 'metadata'])


class BaseSink(ABC):
    config_class = None

    def __init__(self, config: Dict, **kwargs):
        self.connector_type = config.get('connector_type')
        if self.config_class is not None:
            if 'connector_type' in config:
                config.pop('connector_type')
            self.config = self.config_class.load(config=config)
        self.buffer_path = kwargs.get('buffer_path')
        self.buffer = self.read_buffer() or []
        self.buffer_start_time = None
        try:
            self.init_client()
        except Exception:
            self.destroy()
            raise

    @abstractmethod
    def init_client(self):
        """
        Initialize the client for the sink.
        """

    def write(self, message: Dict):
        """
        Write the single message to the sink.
        """
        self.batch_write([message])

    @abstractmethod
    def batch_write(self, messages: List[Dict]):
        """
        Batch write the messages to the sink.

        For each message, the message format could be one of the following ones:
        1. message is the whole data to be wirtten into the sink
        2. message contains the data and metadata with the foramt {"data": {...}, "metadata": {...}}
            The data value is the data to be written into the sink. The metadata is used to store
            extra information that can be used in the write method (e.g. timestamp, index, etc.).
        """

    def clear_buffer(self):
        self.buffer = []
        if not self.buffer_path:
            return
        with open(self.buffer_path, 'w'):
            pass

    def destroy(self):  # noqa: B027
        """
        Close connections and destroy threads
        """
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

    def _is_message_format_v2(self, message: Dict):
        """
        Check whether the message is with the foramt {"data": {...}, "metadata": {...}}
        """
        if isinstance(message, dict):
            if set(message.keys()) == MESSAGE_FORMAT_V2_KEYS:
                return True
        return False

    def _print(self, msg):
        print(f'[{self.__class__.__name__}] {msg}')

    def __del__(self):
        self.destroy()
