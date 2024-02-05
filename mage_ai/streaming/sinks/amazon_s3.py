from dataclasses import dataclass

import boto3

from mage_ai.streaming.sinks.base_object_storage import (
    BaseObjectStorageConfig,
    BaseObjectStorageSink,
)


@dataclass
class AmazonS3Config(BaseObjectStorageConfig):
    pass


class AmazonS3Sink(BaseObjectStorageSink):
    config_class = AmazonS3Config

    def init_storage_client(self):
        self.client = boto3.client('s3')

    def upload_data_with_client(
        self,
        buffer,
        key: str,
    ):
        self.client.put_object(Body=buffer, Bucket=self.config.bucket, Key=key)
