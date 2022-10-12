from dataclasses import dataclass
from kafka import KafkaConsumer
from typing import Dict
import json
import time


@dataclass
class KafkaSourceConfig:
    bootstrap_server: str
    consumer_group: str
    topic: str


class KafkaSource:
    def __init__(self, config: Dict):
        if 'connector_type' in config:
            config.pop('connector_type')
        self.config = KafkaSourceConfig(**config)

        print('Start initializing kafka consumer.')
        # Initialize kafka consumer
        self.consumer = KafkaConsumer(
            self.config.topic,
            group_id=self.config.consumer_group,
            bootstrap_servers=self.config.bootstrap_server,
        )
        print('Finish initializing kafka consumer.')

    def read(self):
        print('Start reading messages.')
        for message in self.consumer:
            print(f'[Kafka] Receive message {message.partition}:{message.offset}: '
                  f'v={message.value}, time={time.time()}')
            data = json.loads(message.value.decode('utf-8'))
            yield data

    def test_connection(self):
        return True
