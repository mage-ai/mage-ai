import os
import logging
from typing import Dict, List
from datetime import datetime, timezone
from io import BytesIO

import pandas as pd
from google.cloud import storage

from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.utils import update_record_with_internal_columns


class GoogleCloudStorage(Destination):
    """
    Export data to Google Cloud Storage.

    Attributes:
        bucket (str): The GCS bucket name to export data to.
        file_type (str): The file type to export the data in, default is 'csv'.
        object_key_path (str): The object key path in the bucket to export data to.
        region (str): The GCS region to export data to, default is 'us-west1'.
        client (google.cloud.storage.Client): The GCS client object used to interact with the API.
    """    
    @property
    def bucket(self) -> str:
        """
        str: The GCS bucket name to export data to.
        """
        return self.config['bucket']

    @property
    def file_type(self) -> str:
        """
        str: The file type to export the data in, default is 'csv'.
        """
        return self.config.get('file_type', 'csv')

    @property
    def object_key_path(self) -> str:
        """
        str: The object key path in the bucket to export data to.
        """
        return self.config['object_key_path']

    def __init__(self, **kwargs):
        """
        Initialize a new GoogleCloudStorage object.

        Args:
            **kwargs: Additional arguments to pass to the superclass constructor.
        """        
        super().__init__(**kwargs)
        self.client = storage.Client.from_service_account_json(self.config['service_account_json'])

    def _build_object_key(self, table_name):
        """
        Build the object key for for the exported data.

        Args:
            table_name (str): The name of the table to export.

        Returns:
            str: The object key for the GCS object.
        """              
        curr_time = datetime.now(timezone.utc)
        date_partition_format = self.config.get('date_partition_format')
        filename = curr_time.strftime('%Y%m%d-%H%M%S')
        filename = f'{filename}.{self.file_type}'
        object_key = os.path.join(self.object_key_path, table_name)
        if date_partition_format:
            object_key = os.path.join(object_key, curr_time.strftime(date_partition_format))
        object_key = os.path.join(object_key, filename)
        return object_key

    def export_batch_data(self, record_data: List[Dict], stream: str) -> None:
        """
        Export the given batch of data to Google Cloud Storage.

        Args:
            record_data (List[Dict]): A list of dictionaries, where each dictionary represents a record to be exported.
            stream (str): The name of the stream from which the data was read.
        """        
        table_name = self.config.get('table')
        object_key = self._build_object_key(table_name)

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

        bucket = self.client.bucket(self.bucket)
        blob = bucket.blob(object_key)
        blob.upload_from_file(buffer)

        tags.update(
            records_inserted=len(record_data),
        )

        self.logger.info('Export data completed.', tags=tags)

    def test_connection(self) -> None:
        try:
            bucket = self.client.bucket(self.bucket)
            bucket.exists()
        except Exception as e:
            logging.error(f"Failed to test connection to {self.bucket}: {e}")
            raise e


if __name__ == '__main__':
    import argparse
    import sys

    parser = argparse.ArgumentParser(description='Export data to Google Cloud Storage.')
    parser.add_argument('--table', type=str, required=True, help='Table name to export.')
    parser.add_argument('--bucket', type=str, required=True, help='GCS bucket name.')
    parser.add_argument('--object_key_path', type=str, required=True, help='GCS object key path.')
    parser.add_argument('--file_type', type=str, default='csv', help='File type to export.')
    parser.add_argument('--region', type=str, default='us-west1', help='GCS region.')
    parser.add_argument('--service_account_json', type=str, required=True, help='Path to service account JSON file.')

    args = parser.parse_args()

    destination = GoogleCloudStorage(
        config={
            'table': args.table,
            'bucket': args.bucket,
            'object_key_path': args.object_key_path,
            'file_type': args.file_type,
            'region': args.region,
            'service_account_json': args.service_account_json,
        },
        argument_parser=parser,
        batch_processing=True,
    )

    try:
        destination.test_connection()
        destination.process(sys.stdin.buffer)
    except Exception as e:
        print(f"Failed to export data to Google Cloud Storage: {e}")
        raise e
