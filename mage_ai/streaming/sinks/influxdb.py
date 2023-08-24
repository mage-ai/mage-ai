from dataclasses import dataclass
from influxdb_client import InfluxDBClient, WritePrecision, WriteOptions, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink
from enum import Enum
import numbers
from typing import Dict, List
import json
import time


def get_timestamp_ms():
    return int(time.time() * 1e3)

@dataclass
class InfluxDbConfig(BaseConfig):
    url: str
    bucket: str = None
    token: str = None
    org: str = None
    measurement: str = None


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
        self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        self._print('Finish initializing writer.')

    def write(self, data: Dict):
        self._print(f'Ingest data {data}, time={time.time()}')

        record = {
            "name": data.get("measurement", self.config.measurement),
            "timestamp": data.get("timestamp", get_timestamp_ms()),
            "tags": data.get("tags", {}),
            "fields": data.get("fields", next(iter(data.values()))),
        }
        self.write_api.write(
            bucket=self.config.bucket,
            record=record,
            write_precision=WritePrecision.MS
        )


    def batch_write(self, data: List[Dict]):
        if not data:
            return
        self._print(f'Batch ingest {len(data)} records, time={time.time()}. Sample: {data[0]}')
        for record in data:
            self.write_api.write(
                bucket=self.config.bucket,
                record=record,
                write_precision=WritePrecision.MS
            )
