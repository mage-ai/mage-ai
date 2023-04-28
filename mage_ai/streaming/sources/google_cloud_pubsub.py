from google.api_core import retry
from google.cloud import pubsub_v1
from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE
from mage_ai.streaming.sources.base import BaseSource
from typing import Callable
import os


@dataclass
class GoogleCloudPubSubConfig(BaseConfig):
    project_id: str
    topic_id: str
    subscription_id: str
    timeout: int = 5
    batch_size: int = DEFAULT_BATCH_SIZE
    pubsub_emulator_host: str = None  # e.g., host.docker.internal:8085


class GoogleCloudPubSubSource(BaseSource):
    config_class = GoogleCloudPubSubConfig

    def init_client(self) -> None:
        if self.config.pubsub_emulator_host is not None:
            os.environ["PUBSUB_EMULATOR_HOST"] = self.config.pubsub_emulator_host
        self.subscriber_client = pubsub_v1.SubscriberClient()

    def read(self, handler: Callable) -> None:
        self._print('Start consuming messages.')

        def callback(message: pubsub_v1.subscriber.message.Message) -> None:
            self._print(f"Received Google cloud pubsub_v1 message: {message}.")
            handler(dict(data=message.data.decode()))
            message.ack()

        with self.subscriber_client:
            subscription_path = self.subscriber_client.subscription_path(
                self.config.project_id, self.config.subscription_id)
            streaming_pull_future = self.subscriber_client.subscribe(
                subscription_path, callback=callback)

            try:
                # When `timeout` is not set, result() will block indefinitely,
                # unless an exception is encountered first.
                self._print('Start receiving message with timeout: {self.config.timeout}')
                streaming_pull_future.result(timeout=self.config.timeout)
            except TimeoutError:
                streaming_pull_future.cancel()  # Trigger the shutdown.
                streaming_pull_future.result()  # Block until the shutdown is complete.

    def batch_read(self, handler: Callable) -> None:
        self._print('Start consuming messages.')
        if self.config.batch_size > 0:
            batch_size = self.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE

        with self.subscriber_client:
            subscription_path = self.subscriber_client.subscription_path(
                self.config.project_id, self.config.subscription_id)
            response = self.subscriber_client.pull(
                request={"subscription": subscription_path, "max_messages": batch_size},
                retry=retry.Retry(deadline=300),
            )

            if len(response.received_messages) == 0:
                return

            ack_ids = []
            self._print(f"Total number of received messages: {len(response.received_messages)}")
            for received_message in response.received_messages:
                self._print(f"Received: {received_message.message.data}.")
                handler(dict(data=received_message.data.decode()))
                self._print(f"Handled: {received_message.message.data}.")
                ack_ids.append(received_message.ack_id)

            # Acknowledges the received messages so they will not be sent again.
            self.subscriber_client.acknowledge(
                request={"subscription": subscription_path, "ack_ids": ack_ids}
            )

            self._print(
                f"Received and acknowledged {len(response.received_messages)}"
                f" messages from {subscription_path}."
            )
