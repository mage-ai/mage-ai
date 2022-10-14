from dataclasses import dataclass
from kafka import KafkaConsumer
from typing import Dict
import json
import time

DEFAULT_BATCH_SIZE = 100


@dataclass
class KafkaSourceConfig:
    bootstrap_server: str
    consumer_group: str
    topic: str
    batch_size: int = DEFAULT_BATCH_SIZE


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
            enable_auto_commit=True,
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
