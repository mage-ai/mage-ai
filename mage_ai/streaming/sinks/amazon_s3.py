import os
import sys
import threading
import time
import traceback
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from typing import Dict, List

import boto3
import pandas as pd

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class AmazonS3Config(BaseConfig):
    bucket: str
    prefix: str
    file_type: str = 'parquet'
    buffer_size_mb: int = 5
    buffer_timeout_seconds: int = 300
    date_partition_format: str = None


class AmazonS3Sink(BaseSink):
    config_class = AmazonS3Config

    def init_client(self):
        self.client = boto3.client('s3')
        self.last_upload_time = None
        self.timer = threading.Timer(self.config.buffer_timeout_seconds, self.upload_data_to_s3)
        self.timer.start()
        if self.buffer:
            self.upload_data_to_s3()

    def destroy(self):
        try:
            self.timer.cancel()
        except Exception:
            traceback.print_exc()

    def write(self, message: Dict):
        self._print(f'Ingest data {message}, time={time.time()}')
        self.write_buffer([message])

    def batch_write(self, messages: List[Dict]):
        if not messages:
            return
        self._print(
            f'Batch ingest {len(messages)} records, time={time.time()}. Sample: {messages[0]}')
        self.write_buffer(messages)

        if self.config.buffer_size_mb and \
                sys.getsizeof(self.buffer) >= self.config.buffer_size_mb * 1_000_000:
            self.upload_data_to_s3()
            return

    def upload_data_to_s3(self):
        self.__reset_timer()
        if not self.buffer:
            return
        self._print(f'Upload {len(self.buffer)} records to S3.')

        df = pd.DataFrame(self.buffer)
        buffer = BytesIO()
        if self.config.file_type == 'parquet':
            df.to_parquet(buffer)
        elif self.config.file_type == 'csv':
            df.to_csv(buffer, index=False)
        else:
            raise Exception(f'File type {self.config.file_type} is not supported.')

        buffer.seek(0)

        curr_time = datetime.now(timezone.utc)

        filename = curr_time.strftime('%Y%m%d-%H%M%S')
        filename = f'{filename}.{self.config.file_type}'

        object_key = self.config.prefix

        date_partition_format = self.config.date_partition_format
        if date_partition_format:
            object_key = os.path.join(object_key, curr_time.strftime(date_partition_format))

        object_key = os.path.join(object_key, filename)

        self.client.put_object(Body=buffer, Bucket=self.config.bucket, Key=object_key)
        self.clear_buffer()

    def __reset_timer(self):
        try:
            self.timer.cancel()
        except Exception:
            traceback.print_exc()
        self.timer = threading.Timer(self.config.buffer_timeout_seconds, self.upload_data_to_s3)
        self.timer.start()
