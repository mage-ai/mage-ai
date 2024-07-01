import os
import sys
import threading
import time
import traceback
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from typing import Dict, List

import pandas as pd
import supabase

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class SupabaseConfigSink(BaseConfig):
    bucket: str
    prefix: str
    url: str
    api_key: str
    file_options: str = None
    file_type: str = 'parquet'
    buffer_size_mb: int = 5
    buffer_timeout_seconds: int = 300
    date_partition_format: str = None
    login_type: str = 'password'
    password: str = None
    email: str = None
    phone: str = None
    auth_provider: str = None
    options: str = None


class SupabaseStorageSink(BaseSink):
    config_class = SupabaseConfigSink

    def init_client(self):
        self.last_upload_time = None

        self.timer = threading.Timer(
            self.config.buffer_timeout_seconds,
            self.upload_data_to_supabase
        )

        self.timer.start()

        self.client = supabase.Client(self.config.url, self.config.api_key)

        if self.config.login_type == 'password':
            if self.config.password and self.config.email:
                self.client.auth.sign_in_with_password({
                    'email': self.config.email,
                    'password': self.config.password
                })
            elif self.config.password and self.config.phone:
                # TODO
                # Password and Phone login type
                # Require a Token validation after the initial sign_in_with_password
                raise Exception('Phone and token login not supported')
            else:
                raise Exception('Missing Password OR email settings for password login type')
        elif self.config.login_type == 'otp':
            if self.config.phone or self.config.email:
                self.client.auth.sign_in_with_otp({
                    'phone': self.config.phone,
                    'email': self.config.email,
                    'options': self.config.options
                })
            else:
                raise Exception('You must provide either an email \
                                or phone number for otp login type')
        elif self.config.login_type == 'oauth':
            self.client.auth.sign_in_with_oauth({
                'provider': self.config.auth_provider,
                'options': self.config.options
            })
        else:
            raise Exception('invalid login_type. Valid types are: password, otp, oauth')

        if self.buffer:
            self.upload_data_to_supabase()

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
            self.upload_data_to_supabase()
            return

    def upload_data_to_supabase(self):
        self.__reset_timer()
        if not self.buffer:
            return
        self._print(f'Upload {len(self.buffer)} records to Supabase storage.')

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

        self.client.storage.from_(self.config.bucket).upload(
            file=buffer.getvalue(),
            path=object_key,
            file_options=self.config.file_options
        )

        self.clear_buffer()

    def __reset_timer(self):
        try:
            self.timer.cancel()
        except Exception:
            traceback.print_exc()

        self.timer = threading.Timer(
            self.config.buffer_timeout_seconds,
            self.upload_data_to_supabase

        )
        self.timer.start()
