import json
import threading
import time
from dataclasses import dataclass
from enum import Enum
from typing import Callable, Dict

import boto3

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE
from mage_ai.streaming.sources.base import BaseSource
from mage_ai.streaming.sources.shared import SerDeConfig, SerializationMethod

DEFAULT_WAIT_TIME_SECONDS = 1


class MessageDeletionMethod(str, Enum):
    AFTER_RECEIVED = 'AFTER_RECEIVED'
    MANUAL = 'MANUAL'


@dataclass
class AmazonSqsConfig(BaseConfig):
    queue_name: str
    batch_size: int = DEFAULT_BATCH_SIZE
    wait_time_seconds: int = DEFAULT_WAIT_TIME_SECONDS
    serde_config: SerDeConfig = None
    message_deletion_method: MessageDeletionMethod = MessageDeletionMethod.AFTER_RECEIVED

    @classmethod
    def parse_config(self, config: Dict) -> Dict:
        serde_config = config.get('serde_config')
        if serde_config and type(serde_config) is dict:
            config['serde_config'] = SerDeConfig(**serde_config)
        return config


class MessageConsumerThread(threading.Thread):
    def __init__(self, source, handler):
        super().__init__()
        self.source = source
        self.handler = handler
        self.is_running = True
        self.last_message_time = time.time()

    def run(self):
        if self.source.config.batch_size > 0:
            batch_size = self.source.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE

        try:
            while self.is_running:
                messages = self.source.queue.receive_messages(
                    MessageAttributeNames=['All'],
                    MaxNumberOfMessages=batch_size,
                    WaitTimeSeconds=self.source.config.wait_time_seconds,
                )
                self.update_last_message_time()
                parsed_messages = []
                for msg in messages:
                    parsed_msg_body = self.source.deserialize_message(msg.body)
                    if self.source.config.message_deletion_method == \
                            MessageDeletionMethod.AFTER_RECEIVED:
                        parsed_messages.append(parsed_msg_body)
                        msg.delete()
                    else:
                        parsed_messages.append(dict(
                            parsed_msg_body=self.source.deserialize_message(msg.body),
                            raw_message=msg,
                        ))
                if len(parsed_messages) > 0:
                    self.source.print(
                        f'Received {len(parsed_messages)} message. '
                        f'Sample: {parsed_messages[0]}.')
                    self.handler(parsed_messages)
        except Exception:
            self.source.print(
                f'Couldn\'t receive messages from queue {self.source.config.queue_name}.')
            raise

    def stop(self):
        self.is_running = False

    def update_last_message_time(self):
        self.last_message_time = time.time()


class HealthCheckThread(threading.Thread):
    def __init__(
        self,
        source,
        message_consumer_thread,
        timeout_seconds,
    ):
        super().__init__()
        self.source = source
        self.message_consumer_thread = message_consumer_thread
        self.timeout_seconds = timeout_seconds

    def run(self):
        while True:
            current_time = time.time()
            last_message_time = self.message_consumer_thread.last_message_time
            time_since_last_message = current_time - last_message_time
            if time_since_last_message > self.timeout_seconds:
                self.source.print(
                    f'No messages consumed for {time_since_last_message} seconds. '
                    'Initiating restart...')
                self.message_consumer_thread.stop()  # Gracefully stop the consumer
                # Stop the health check after consumer is stopped
                return
            else:
                self.source.print(
                    'Message consumer is healthy. '
                    f'Time since last message consuming attempt: {time_since_last_message} seconds')

            time.sleep(self.timeout_seconds)


class AmazonSqsSource(BaseSource):
    config_class = AmazonSqsConfig

    def init_client(self):
        self._print('Start initializing consumer.')
        self.sqs_client = boto3.resource('sqs')
        self.queue = self.sqs_client.get_queue_by_name(QueueName=self.config.queue_name)
        print(self.queue.url)
        self._print('Finish initializing consumer.')

    def read(self, handler: Callable):
        pass

    def batch_read(self, handler: Callable):
        """
        Batch read messages from SQS queue with health check.
        """
        self._print('Start consuming messages.')
        consumer_thread = MessageConsumerThread(self, handler)

        # Start the consumer thread as the main thread
        consumer_thread.start()

        # Set the desired timeout
        health_check_thread = HealthCheckThread(
            self,
            consumer_thread,
            timeout_seconds=max(60, self.config.wait_time_seconds * 2),
        )

        # Start the health check thread as a daemon thread
        health_check_thread.daemon = True
        health_check_thread.start()

        # Wait for the consumer thread to finish (optional)
        consumer_thread.join()

    def deserialize_message(self, message):
        if self.config.serde_config is not None and \
                self.config.serde_config.serialization_method == SerializationMethod.RAW_VALUE:
            return message
        else:
            return json.loads(message)
