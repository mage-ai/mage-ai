import argparse
import os
import sys
from datetime import datetime, timezone
from io import BytesIO
from typing import Dict, List

import pandas as pd
from google.cloud.storage import Client

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.utils import update_record_with_internal_columns


class GoogleCloudStorage(Destination):
    @property
    def bucket(self) -> str:
        return self.config['bucket']

    @property
    def file_type(self) -> str:
        return self.config.get('file_type')

    @property
    def object_key_path(self) -> str:
        return self.config.get('object_key_path', '')

    def build_client(self) -> Client:
        credential_file = self.config.get('google_application_credentials')
        if credential_file:
            return Client.from_service_account_json(
                json_credentials_path=credential_file,
            )
        return Client()

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

        bucket = client.bucket(self.bucket)
        blob = bucket.blob(object_key)
        blob.upload_from_file(buffer)

        tags.update(
            records_inserted=len(record_data),
        )

        self.logger.info('Export data completed.', tags=tags)

    def test_connection(self) -> None:
        client = self.build_client()
        client.get_bucket(self.bucket)


if __name__ == '__main__':
    destination = GoogleCloudStorage(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
