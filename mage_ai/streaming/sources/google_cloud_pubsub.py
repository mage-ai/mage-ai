from google.api_core import retry
from google.cloud import pubsub_v1
from google.oauth2 import service_account
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
    pubsub_emulator_host: str = None  # e.g., "host.docker.internal:8085"
    path_to_credentials_json_file: str = None  # e.g., "./google_credentials.json"


class GoogleCloudPubSubSource(BaseSource):
    """
    Handles data transfer between a Google Cloud Pub/Sub topic and the Mage app.

    GOOGLE_APPLICATION_CREDENTIALS environment could be used to set the Google Cloud
    credentials file for authentication.
    """

    config_class = GoogleCloudPubSubConfig

    def _get_publisher_client(self) -> pubsub_v1.PublisherClient:
        if self.config.path_to_credentials_json_file is not None:
            credentials = service_account.Credentials.from_service_account_file(
                self.config.path_to_credentials_json_file
            )
            return pubsub_v1.PublisherClient(credentials=credentials)
        else:
            return pubsub_v1.PublisherClient()

    def _get_subscriber_client(self) -> pubsub_v1.SubscriberClient:
        if self.config.path_to_credentials_json_file is not None:
            credentials = service_account.Credentials.from_service_account_file(
                self.config.path_to_credentials_json_file
            )
            return pubsub_v1.SubscriberClient(credentials=credentials)
        else:
            return pubsub_v1.SubscriberClient()

    def _exist_subscription(self, project_id: str) -> bool:
        project_path = f'projects/{project_id}'
        subscriptions = self.subscriber_client.list_subscriptions(
            request={'project': project_path}
        )
        for subscription in subscriptions:
            if subscription.name == self.subscription_path:
                return True
        return False

    def _create_subscription(
            self, project_id: str, topic_id: str, subscription_id: str) -> None:
        """Create a new pull subscription on the given topic."""
        # [START pubsub_create_pull_subscription]
        if self._exist_subscription(project_id):
            self._print(f'Subscription already exists: {self.subscription_path}')
            return

        publisher = self._get_publisher_client()
        topic_path = publisher.topic_path(project_id, topic_id)
        subscription = self.subscriber_client.create_subscription(
            request={'name': self.subscription_path, 'topic': topic_path}
        )
        self._print(f'Subscription created: {subscription}')
        # [END pubsub_create_pull_subscription]

    def init_client(self) -> None:
        if self.config.pubsub_emulator_host is not None:
            os.environ['PUBSUB_EMULATOR_HOST'] = self.config.pubsub_emulator_host

        self.subscriber_client = self._get_subscriber_client()
        self.subscription_path = self.subscriber_client.subscription_path(
            self.config.project_id, self.config.subscription_id)
        self._create_subscription(
            self.config.project_id,
            self.config.topic_id,
            self.config.subscription_id)

    def read(self, handler: Callable) -> None:
        self._print('Start consuming messages.')

        def callback(
                received_message: pubsub_v1.subscriber.message.Message) -> None:
            # self._print(f'Received: {received_message}.')
            handler(dict(data=received_message.message.data.decode()))
            # self._print(f'Handled: {received_message.message.data}.')
            received_message.ack()

        with self.subscriber_client:
            streaming_pull_future = self.subscriber_client.subscribe(
                self.subscription_path, callback=callback)

            try:
                # When `timeout` is not set, result() will block indefinitely,
                # unless an exception is encountered first.
                self._print('Start receiving message with timeout: {self.config.timeout}')
                streaming_pull_future.result(timeout=self.config.timeout)
            except TimeoutError:
                streaming_pull_future.cancel()  # Trigger the shutdown.
                streaming_pull_future.result()  # Block until the shutdown is complete.

    def batch_read(self, handler: Callable) -> None:
        self._print('Start consuming batch messages.')
        if self.config.batch_size > 0:
            batch_size = self.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE

        with self.subscriber_client:
            while True:
                response = self.subscriber_client.pull(
                    request={
                        'subscription': self.subscription_path,
                        'max_messages': batch_size
                    },
                    retry=retry.Retry(deadline=300),
                )

                if len(response.received_messages) == 0:
                    continue

                ack_ids = []
                message_values = []
                self._print(f'Number of received messages: '
                            f'{len(response.received_messages)}')
                for received_message in response.received_messages:
                    # self._print(f'Received: {received_message.message.data}.')
                    message_values.append(
                        dict(data=received_message.message.data.decode())
                    )
                    # self._print(f'Batched: {received_message.message.data}.')
                    ack_ids.append(received_message.ack_id)

                handler(message_values)  # Handle the received messages.
                # Acknowledges the received messages so they will not be sent again.
                self.subscriber_client.acknowledge(
                    request={
                        'subscription': self.subscription_path,
                        'ack_ids': ack_ids
                    }
                )

                self._print(
                    f'Received and acknowledged {len(response.received_messages)}'
                    f' messages from {self.subscription_path}.'
                )
