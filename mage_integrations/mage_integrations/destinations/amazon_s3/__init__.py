from botocore.config import Config
from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.utils import update_record_with_internal_columns
from datetime import datetime
from io import BytesIO
from typing import Dict, List
import argparse
import boto3
import os
import pandas as pd
import sys


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

    def export_batch_data(self, record_data: List[Dict], stream: str) -> None:
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

        buffer = BytesIO()
        if self.file_type == 'parquet':
            df.to_parquet(buffer)
        elif self.file_type == 'csv':
            df.to_csv(buffer, index=False)
        else:
            raise Exception(f'File type {self.file_type} is not supported.')

        buffer.seek(0)

        filename = datetime.now().strftime('%Y%m%d-%H%M%S')
        filename = f'{filename}.{self.file_type}'

        object_key = os.path.join(self.object_key_path, table_name, filename)

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
