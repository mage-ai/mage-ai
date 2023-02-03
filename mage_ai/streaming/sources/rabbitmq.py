from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sources.base import BaseSource
from dataclasses import dataclass
from typing import Callable, Dict
import pika


@dataclass
class ConsumerConfig:
    auto_ack: bool = None
    exclusive: bool = None
    inactivity_timeout: float = None





@dataclass
class PikaConfig(BaseConfig):
    connection_host: str
    connection_port: int
    queue_name: str
    queue_prefetch: int = 1
    consumer_config = ConsumerConfig = None

    @classmethod
    def parse_config(self, config: Dict) -> Dict:
        consumer_config = config.get('consumer_config')
        if consumer_config is not None and type(consumer_config) is dict:
            config['consumer_config'] = ConsumerConfig(**consumer_config)
        return config

    


@dataclass
class PikaSource(BaseSource):
    config_class = PikaConfig


    def init_connection(self):

        self._print(f'Starting to initialize consumer for queue {self.config.queue_name}')

        self.create_connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=self.config.connection_host,port=self.config.connection_port))

        self.channel = self.create_connection.channel()

        self.channel.basic_qos(prefetch_size=self.config.queue_prefetch)


    def read(self, handler:Callable):
        self._print('Start consuming messages.')
        for message in self.channel.consume(self.config.queue_name):
            self.__print_message(message)
            handler(message)
        

    def batch_read(self):
        pass

    def __print_message(self, message):
        self._print(f'Received message {message[0].delivery_tag}')
        



    