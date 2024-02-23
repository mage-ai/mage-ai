import argparse
import os
import sys
from datetime import datetime, timezone
from io import BytesIO
from typing import Dict, List

import boto3
import pandas as pd
from botocore.config import Config

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.constants import COLUMN_FORMAT_DATETIME
from mage_integrations.destinations.utils import update_record_with_internal_columns


class AmazonS3(Destination):
    @property
    def bucket(self) -> str:
        return self.config['bucket']

    @property
    def file_type(self) -> str:
        return self.config.get('file_type')

    @property
    def object_key_path(self) -> str:
        return self.config['object_key_path']

    @property
    def region(self) -> str:
        return self.config.get('aws_region', 'us-west-2')

    @property
    def endpoint(self) -> str:
        return self.config.get("aws_endpoint")

    def build_client(self):
        config = Config(
           retries={
              'max_attempts': 10,
              'mode': 'standard',
           },
        )

        if (
            not self.config.get('aws_access_key_id') and
            not self.config.get('aws_secret_access_key') and
            self.config.get('role_arn')
        ):
            # Assume IAM role and get credentials
            role_session_name = self.config.get('role_session_name', 'mage-data-integration')
            sts_session = boto3.Session()
            sts_connection = sts_session.client('sts')
            assume_role_object = sts_connection.assume_role(
                RoleArn=self.config.get('role_arn'),
                RoleSessionName=role_session_name,
            )

            session = boto3.Session(
                aws_access_key_id=assume_role_object['Credentials']['AccessKeyId'],
                aws_secret_access_key=assume_role_object['Credentials']['SecretAccessKey'],
                aws_session_token=assume_role_object['Credentials']['SessionToken'],
            )

            return session.client(
                's3',
                config=config,
                region_name=self.region,
            )

        return boto3.client(
            's3',
            aws_access_key_id=self.config.get('aws_access_key_id'),
            aws_secret_access_key=self.config.get('aws_secret_access_key'),
            config=config,
            region_name=self.region,
            endpoint_url=self.endpoint,
        )

    def export_batch_data(self, record_data: List[Dict], stream: str, tags: Dict = None) -> None:
        client = self.build_client()

        table_name = self.config.get('table')

        tags = dict(
            records=len(record_data),
            stream=stream,
            table_name=table_name,
        )

        self.logger.info('Export data started', tags=tags)

        # Add _mage_created_at and _mage_updated_at columns
        for r in record_data:
            r['record'] = update_record_with_internal_columns(r['record'])

        df = pd.DataFrame([d['record'] for d in record_data])

        # Convert data types
        schema = self.schemas[stream]
        for column, column_settings in schema['properties'].items():
            if COLUMN_FORMAT_DATETIME == column_settings.get('format'):
                df[column] = pd.to_datetime(df[column])

        column_header_format = self.config.get('column_header_format')
        if column_header_format:
            column_mapping = None
            if column_header_format == 'lower':
                column_mapping = {col: col.lower() for col in df.columns}
            elif column_header_format == 'upper':
                column_mapping = {col: col.upper() for col in df.columns}
            if column_mapping:
                df = df.rename(columns=column_mapping)

        buffer = BytesIO()
        if self.file_type == 'parquet':
            df.to_parquet(
                buffer,
                coerce_timestamps='ms',
                allow_truncated_timestamps=True,
            )
        elif self.file_type == 'csv':
            df.to_csv(buffer, index=False)
        else:
            raise Exception(f'File type {self.file_type} is not supported.')

        buffer.seek(0)

        curr_time = datetime.now(timezone.utc)

        filename = curr_time.strftime('%Y%m%d-%H%M%S')
        filename = f'{filename}.{self.file_type}'

        object_key = os.path.join(self.object_key_path, table_name)

        date_partition_format = self.config.get('date_partition_format')
        if date_partition_format:
            object_key = os.path.join(object_key, curr_time.strftime(date_partition_format))

        object_key = os.path.join(object_key, filename)

        client.put_object(Body=buffer, Bucket=self.bucket, Key=object_key)

        tags.update(
            records_inserted=len(record_data),
        )

        self.logger.info('Export data completed.', tags=tags)

    def test_connection(self) -> None:
        client = self.build_client()
        client.head_bucket(Bucket=self.bucket)


if __name__ == '__main__':
    destination = AmazonS3(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
