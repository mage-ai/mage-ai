import json
import os
import time
from dataclasses import dataclass
from typing import Dict, List

from google.cloud import pubsub_v1
from google.oauth2 import service_account

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class GoogleCloudPubSubConfig(BaseConfig):
    project_id: str
    topic_id: str
    pubsub_emulator_host: str = None  # e.g., "host.docker.internal:8085"
    path_to_credentials_json_file: str = None  # e.g., "./google_credentials.json"


class GoogleCloudPubSubSink(BaseSink):
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

    def init_client(self) -> None:
        if self.config.pubsub_emulator_host is not None:
            os.environ['PUBSUB_EMULATOR_HOST'] = self.config.pubsub_emulator_host

        self.publisher_client = self._get_publisher_client()
        self.topic_path = self.publisher_client.topic_path(
            self.config.project_id, self.config.topic_id)

    def write(self, message: Dict):

        if isinstance(message, dict):
            data = json.dumps(message.get('data', message))
        else:
            data = message

        self.publisher_client.publish(self.topic_path, data.encode())

    def batch_write(self, messages: List[Dict]):
        if not messages:
            return
        self._print(
            f'Batch ingest {len(messages)} messages, time={time.time()}. Sample: {messages[0]}'
        )

        for message in messages:
            self.write(message)
