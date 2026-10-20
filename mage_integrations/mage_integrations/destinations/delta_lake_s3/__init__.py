import os
import posixpath
from typing import Dict

import boto3
from botocore.config import Config

from mage_integrations.destinations.delta_lake.base import DeltaLake as BaseDeltaLake
from mage_integrations.destinations.delta_lake.base import main
from mage_integrations.destinations.delta_lake.constants import MODE_OVERWRITE
from mage_integrations.destinations.delta_lake_s3.utils import (
    fix_overwritten_partitions,
)


class DeltaLakeS3(BaseDeltaLake):
    """
    WARNING:
    If you get this error EndpointConnectionError occasionally,
    it’s because you have an ~/.aws/credentials file. Remove that file or else this error
    occurs occasionally from boto3.
    """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.aws_region = None

    @property
    def bucket(self) -> str:
        return self.config['bucket']

    @property
    def region(self) -> str:
        return self.config.get('aws_region', 'us-west-2')

    @property
    def delta_log_object_key_path(self) -> str:
        return f'{self.table_object_key_path}/_delta_log'

    @property
    def table_object_key_path(self) -> str:
        return f"{self.config['object_key_path']}/{self.config['table']}"

    # PyDeltaTableError: Failed to load checkpoint: Failed to read checkpoint content:
    # Generic S3 error: Error performing get request ../_delta_log/_last_checkpoint:
    # response error "Received redirect without LOCATION,
    # this normally indicates an incorrectly configured region", after 0 retries
    # The above error is caused having AWS environment variables with values that
    # don’t match the S3 storage options when using Delta Lake to read and write from S3.
    def before_process(self) -> None:
        self.aws_region = os.getenv('AWS_DEFAULT_REGION')
        if self.aws_region:
            os.environ['AWS_DEFAULT_REGION'] = self.region

    def after_process(self) -> None:
        if self.aws_region:
            os.environ['AWS_DEFAULT_REGION'] = self.aws_region
        self.aws_region = None

    def after_write_for_batch(self, stream, index, **kwargs) -> None:
        if MODE_OVERWRITE != self.mode or len(self.partition_keys.get(stream, [])) == 0:
            return

        table = self.get_table_for_stream(stream)

        version = int(table.version())
        tags = kwargs.get('tags', {})
        tags.update(version=version)

        if version == 0:
            self.logger.info(f'Fix overwritten partitions for batch {index} skipped.', tags=tags)
            return
        else:
            self.logger.info(f'Fix overwritten partitions for batch {index} started.', tags=tags)

        fix_overwritten_partitions(
            self.build_client(),
            self.bucket,
            self.delta_log_object_key_path,
            version,
        )

        self.logger.info(f'Fix overwritten partitions for batch {index} completed.', tags=tags)

    def build_storage_options(self) -> Dict:
        return {
            'AWS_ACCESS_KEY_ID': self.config['aws_access_key_id'],
            'AWS_REGION': self.region,
            'AWS_S3_ALLOW_UNSAFE_RENAME': 'true',
            'AWS_SECRET_ACCESS_KEY': self.config['aws_secret_access_key'],
        }

    def build_table_uri(self, stream: str) -> str:
        return posixpath.join([
            f"s3://{self.config['bucket']}",
            self.config['object_key_path'],
            self.table_name,
        ])

    def build_client(self):
        config = Config(
           retries={
              'max_attempts': 10,
              'mode': 'standard',
           },
        )

        return boto3.client(
            's3',
            aws_access_key_id=self.config['aws_access_key_id'],
            aws_secret_access_key=self.config['aws_secret_access_key'],
            config=config,
            region_name=self.region,
        )

    def check_and_create_delta_log(self, stream: str) -> None:
        client = self.build_client()

        resp = client.list_objects_v2(
            Bucket=self.bucket,
            Prefix=self.delta_log_object_key_path,
        )

        has_logs = 'Contents' in resp
        if not has_logs:
            resp = client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=self.table_object_key_path,
            )

            for obj in resp.get('Contents', []):
                client.delete_object(
                    Bucket=self.bucket,
                    Key=obj['Key'],
                )

        return has_logs

    def test_connection(self) -> None:
        client = self.build_client()
        client.head_bucket(Bucket=self.bucket)


if __name__ == '__main__':
    main(DeltaLakeS3)
