import json
import time
from dataclasses import dataclass
from typing import Dict, List

import boto3

from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sinks.base import BaseSink


@dataclass
class KinesisConfig(BaseConfig):
    stream_name: str        # Kinesis stream name
    partition_key: str      # The partition key to use for the data.


class KinesisSink(BaseSink):
    config_class = KinesisConfig

    def init_client(self):
        self.kinesis_client = boto3.client('kinesis')

    def test_connection(self):
        return True

    def write(self, message: Dict):
        self._print(f'Ingest data {message}, time={time.time()}')
        self.kinesis_client.put_record(
            StreamName=self.config.stream_name,
            Data=json.dumps(message),
            PartitionKey=self.config.partition_key,
        )

    def batch_write(self, messages: List[Dict]):
        if not messages:
            return
        self._print(
            f'Batch ingest {len(messages)} records, time={time.time()}. Sample: {messages[0]}')
        records = [
            {
                'Data': json.dumps(d).encode('utf-8'),
                'PartitionKey': self.config.partition_key,
            } for d in messages
        ]
        self.kinesis_client.put_records(
            Records=records,
            StreamName=self.config.stream_name,
        )
