from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE
from mage_ai.streaming.sources.base import BaseSource
from mage_ai.streaming.sources.shared import SerializationMethod, SerDeConfig
from typing import Callable, Dict
import boto3
import json

DEFAULT_WAIT_TIME_SECONDS = 1


@dataclass
class AmazonSqsConfig(BaseConfig):
    queue_name: str
    batch_size: int = DEFAULT_BATCH_SIZE
    wait_time_seconds: int = DEFAULT_WAIT_TIME_SECONDS
    serde_config: SerDeConfig = None

    @classmethod
    def parse_config(self, config: Dict) -> Dict:
        serde_config = config.get('serde_config')
        if serde_config and type(serde_config) is dict:
            config['serde_config'] = SerDeConfig(**serde_config)
        return config


class AmazonSqsSource(BaseSource):
    config_class = AmazonSqsConfig

    def init_client(self):
        self._print('Start initializing consumer.')
        # Initialize kafka consumer
        self.sqs_client = boto3.resource('sqs')
        self.queue = self.sqs_client.get_queue_by_name(QueueName=self.config.queue_name)
        # self.details = self.kinesis_client.describe_stream(
        #     StreamName=self.config.stream_name,
        # )['StreamDescription']
        print(self.queue.url)
        self._print('Finish initializing consumer.')

    def read(self, handler: Callable):
        pass

    def batch_read(self, handler: Callable):
        self._print('Start consuming messages.')
        if self.config.batch_size > 0:
            batch_size = self.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE

        try:
            while True:
                messages = self.queue.receive_messages(
                    MessageAttributeNames=['All'],
                    MaxNumberOfMessages=batch_size,
                    WaitTimeSeconds=self.config.wait_time_seconds,
                )
                parsed_messages = []
                for msg in messages:
                    parsed_messages.append(self.__deserialize_message(msg.body))
                    msg.delete()
                if len(parsed_messages) > 0:
                    self._print(f'Received {len(parsed_messages)} message. '
                                f'Sample: {parsed_messages[0]}.')
                    handler(parsed_messages)
        except Exception:
            self._print(f'Couldn\'t receive messages from queue {self.config.queue_name}.')
            raise

    def __deserialize_message(self, message):
        if self.config.serde_config is not None and \
                self.config.serde_config.serialization_method == SerializationMethod.RAW_VALUE:
            return message
        else:
            return json.loads(message)
