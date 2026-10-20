import json
from dataclasses import dataclass
from typing import Dict, List

import stomp
from stomp.exception import ConnectFailedException

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class ActiveMQConfig(BaseConfig):
    connection_host: str
    connection_port: int
    queue_name: str
    username: str = 'admin'
    password: str = 'admin'


class ActiveMQSink(BaseSink):
    config_class = ActiveMQConfig

    def init_client(self):
        self._print('Start initializing producer.')
        # Initialize ActiveMQ producer
        queue_name = self.config.queue_name
        username = self.config.username
        password = self.config.password
        connection_host = self.config.connection_host
        connection_port = self.config.connection_port

        self._print(f'Starting to initialize producer for queue {queue_name}')

        try:
            conn = stomp.Connection11([(connection_host, connection_port)])
            self._print('Connecting to broker')
            conn.connect(username, password, wait=True)
            self.connection = conn

            self._print('Connected to broker')

        except ConnectFailedException:
            self._print('Connection Error! Please check broker connection')
            raise ConnectFailedException
        except Exception as e:
            self._print(e)
            raise e

    def write(self, message: Dict):
        pass

    def batch_write(self, messages: List[Dict]):
        if not messages:
            return
        self._print(
            f'Batch ingest {len(messages)} messages. Sample: {messages[0]}'
        )
        for message in messages:
            if isinstance(message, dict):
                data = message.get('data', message)
                metadata = message.get('metadata', None)
            else:
                data = message
                metadata = None
            self.connection.send(destination=f'/queue/{self.config.queue_name}',
                                 body=json.dumps(data).encode('utf-8'),
                                 headers=metadata,
                                 )
