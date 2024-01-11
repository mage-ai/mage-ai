
from dataclasses import dataclass

import boto3

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base_object_storage import BaseObjectStorageSink


@dataclass
class AmazonS3Config(BaseConfig):
    bucket: str
    prefix: str
    file_type: str = 'parquet'
    buffer_size_mb: int = 5
    buffer_timeout_seconds: int = 300
    date_partition_format: str = None


class AmazonS3Sink(BaseObjectStorageSink):
    config_class = AmazonS3Config

    def init_storage_client(self):
        self.client = boto3.client('s3')

    def upload_data_with_client(
        self,
        buffer,
        key,
    ):
        self.client.put_object(Body=buffer, Bucket=self.config.bucket, Key=key)
