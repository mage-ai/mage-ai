import json
from dataclasses import dataclass
from typing import Dict, List

import pika

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class RabbitMQConfig(BaseConfig):
    connection_host: str
    connection_port: int
    queue_name: str
    username: str = 'guest'
    password: str = 'guest'
    amqp_url_virtual_host: str = r'%2f'


class RabbitMQSink(BaseSink):
    config_class = RabbitMQConfig

    def init_client(self):
        self._print('Start initializing producer.')
        # Initialize RabbitMQ producer
        queue_name = self.config.queue_name
        username = self.config.username
        password = self.config.password
        connection_host = self.config.connection_host
        connection_port = self.config.connection_port
        vt_host = self.config.amqp_url_virtual_host

        self._print(f'Starting to initialize producer for queue {queue_name}')

        try:
            generated_url = f"amqp://{username}:{password}@" \
                            f"{connection_host}:{connection_port}/{vt_host}"

            self._print(f'Trying to connect on {generated_url}')
            self.connection = pika.BlockingConnection(
                pika.URLParameters(
                    generated_url
                )
            )

            self.main_channel = self.connection.channel()
            self._print('Finish initializing producer.')
        except Exception as e:
            self._print('Connection Error! Please check RabbitMQ connection')
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
            message_properties = pika.BasicProperties(headers=metadata)
            self.main_channel.basic_publish(
                exchange='',
                routing_key=self.config.queue_name,
                body=json.dumps(data).encode('utf-8'),
                properties=message_properties,
                mandatory=True,
            )
