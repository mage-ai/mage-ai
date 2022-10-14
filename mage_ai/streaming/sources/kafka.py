from dataclasses import dataclass
from kafka import KafkaConsumer
from mage_ai.shared.config import BaseConfig
from typing import Dict
import json
import time

DEFAULT_BATCH_SIZE = 100


@dataclass
class SSLConfig:
    cafile: str = None
    certfile: str = None
    keyfile: str = None
    password: str = None
    check_hostname: bool = False


@dataclass
class KafkaSourceConfig(BaseConfig):
    bootstrap_server: str
    consumer_group: str
    topic: str
    batch_size: int = DEFAULT_BATCH_SIZE
    security_protocol: str = None
    ssl_config: SSLConfig = None

    @classmethod
    def parse_config(self, config: Dict) -> Dict:
        ssl_config = config.get('ssl_config')
        if ssl_config is not None and type(ssl_config) is dict:
            config['ssl_config'] = SSLConfig(**ssl_config)
        return config


class KafkaSource:
    def __init__(self, config: Dict):
        if 'connector_type' in config:
            config.pop('connector_type')
        self.config = KafkaSourceConfig.load(config=config)

        print('Start initializing kafka consumer.')
        # Initialize kafka consumer
        consumer_kwargs = dict(
            group_id=self.config.consumer_group,
            bootstrap_servers=self.config.bootstrap_server,
            enable_auto_commit=True,
        )
        if self.config.security_protocol == 'SSL':
            consumer_kwargs['security_protocol'] = 'SSL'
            consumer_kwargs['ssl_cafile'] = self.config.ssl_config.cafile
            consumer_kwargs['ssl_certfile'] = self.config.ssl_config.certfile
            consumer_kwargs['ssl_keyfile'] = self.config.ssl_config.keyfile
            consumer_kwargs['ssl_password'] = self.config.ssl_config.password
            consumer_kwargs['ssl_check_hostname'] = self.config.ssl_config.check_hostname

        self.consumer = KafkaConsumer(
            self.config.topic,
            **consumer_kwargs
        )
        print('Finish initializing kafka consumer.')

    def read(self):
        print('Start consuming messages from kafka.')
        for message in self.consumer:
            self.__print_message(message)
            data = json.loads(message.value.decode('utf-8'))
            yield data

    def batch_read(self):
        print('Start consuming messages from kafka.')
        if self.config.batch_size > 0:
            batch_size = self.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE
        while True:
            # Response format is {TopicPartiton('topic1', 1): [msg1, msg2]}
            msg_pack = self.consumer.poll(
                max_records=batch_size,
                timeout_ms=500,
            )

            message_values = []
            for tp, messages in msg_pack.items():
                for message in messages:
                    self.__print_message(message)
                    message_values.append(json.loads(message.value.decode('utf-8')))
            if len(message_values) > 0:
                yield message_values

    def test_connection(self):
        return True

    def __print_message(self, message):
        print(f'[Kafka] Receive message {message.partition}:{message.offset}: '
              f'v={message.value}, time={time.time()}')
