from dataclasses import dataclass

from google.cloud import storage
from google.oauth2 import service_account

from mage_ai.streaming.sinks.base_object_storage import (
    BaseObjectStorageConfig,
    BaseObjectStorageSink,
)


@dataclass
class GoogleCloudStorageConfig(BaseObjectStorageConfig):
    path_to_credentials_json_file: str = None  # e.g., "./google_credentials.json"


class GoogleCloudStorageSink(BaseObjectStorageSink):
    config_class = GoogleCloudStorageConfig

    def init_storage_client(self):
        if self.config.path_to_credentials_json_file:
            credentials = service_account.Credentials.from_service_account_file(
                self.config.path_to_credentials_json_file)
            self.client = storage.Client(credentials=credentials)
        else:
            self.client = storage.Client()

    def upload_data_with_client(
        self,
        buffer,
        key: str,
    ):
        bucket = self.client.get_bucket(self.config.bucket)
        blob = bucket.blob(key)
        blob.upload_from_string(buffer.read())
