import time
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Dict, List

from influxdb_client import InfluxDBClient, WriteOptions, WritePrecision

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.constants import DEFAULT_BATCH_SIZE, DEFAULT_TIMEOUT_MS
from mage_ai.streaming.sinks.base import BaseSink


def get_timestamp_ms():
    return int(time.time() * 1e3)


@dataclass
class InfluxDbConfig(BaseConfig):
    url: str
    token: str
    org: str
    bucket: str = 'data'
    measurement: str = 'default'
    batch_size: int = DEFAULT_BATCH_SIZE
    timeout_ms: int = DEFAULT_TIMEOUT_MS


class InfluxDbSink(BaseSink):
    config_class = InfluxDbConfig

    def init_client(self):
        self._print('Start initializing writer.')
        # Initialize influxdb client and write_api
        self.client = InfluxDBClient(
            url=self.config.url,
            token=self.config.token,
            org=self.config.org,
        )
        if self.config.batch_size > 0:
            batch_size = self.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE
        if self.config.timeout_ms > 0:
            timeout_ms = self.config.timeout_ms
        else:
            timeout_ms = DEFAULT_TIMEOUT_MS

        options = WriteOptions(
            batch_size=batch_size,
            flush_interval=timeout_ms,
            jitter_interval=0,
            retry_interval=5_000,
            max_retries=5,
            max_retry_delay=125_000,
            exponential_base=2,
        )
        self.write_api = self.client.write_api(write_options=options)
        self._print('Finish initializing writer.')

    def write(self, message: Dict):
        if isinstance(message, dict):
            data = message.get('data', message)
            metadata = message.get('metadata', {})
        else:
            data = message
            metadata = {}

        if isinstance(data, dict):
            record = {
                'measurement': metadata.get('measurement', self.config.measurement),
                'time': metadata.get('timestamp', get_timestamp_ms()),
                'tags': metadata.get('tags', {}),
                'fields': data,
            }
            self.write_api.write(
                bucket=self.config.bucket,
                record=record,
                write_precision=WritePrecision.MS,
            )
        elif isinstance(data, Iterable):
            for value in data:
                record = {
                    'measurement': metadata.get('measurement', self.config.measurement),
                    'time': metadata.get('timestamp', get_timestamp_ms()),
                    'tags': metadata.get('tags', {}),
                    'fields': {'_value': value},
                }
                self.write_api.write(
                    bucket=self.config.bucket,
                    record=record,
                    write_precision=WritePrecision.MS,
                )
        else:  # data is scalar
            record = {
                'measurement': metadata.get('measurement', self.config.measurement),
                'time': metadata.get('timestamp', get_timestamp_ms()),
                'tags': metadata.get('tags', {}),
                'fields': {'_value': data},
            }
            self.write_api.write(
                bucket=self.config.bucket,
                record=record,
                write_precision=WritePrecision.MS,
            )

    def batch_write(self, messages: List[Dict]):
        if not messages:
            return
        self._print(
            f'Batch ingest {len(messages)} messages, time={time.time()}. Sample: {messages[0]}'
        )
        for message in messages:
            self.write(message)
