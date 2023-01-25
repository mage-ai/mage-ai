from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sources.base import BaseSource
from typing import Callable
import boto3
import json

DEFAULT_BATCH_SIZE = 100


@dataclass
class KinesisConfig(BaseConfig):
    stream_name: str
    batch_size: int = DEFAULT_BATCH_SIZE


class KinesisSource(BaseSource):
    config_class = KinesisConfig

    def init_client(self):
        self._print('Start initializing consumer.')
        # Initialize kafka consumer
        self.kinesis_client = boto3.client('kinesis')
        self.details = self.kinesis_client.describe_stream(
            StreamName=self.config.stream_name,
        )['StreamDescription']
        self._print('Finish initializing consumer.')

    def read(self, handler: Callable):
        pass

    def batch_read(self, handler: Callable):
        self._print('Start consuming messages.')
        if self.config.batch_size > 0:
            batch_size = self.config.batch_size
        else:
            batch_size = DEFAULT_BATCH_SIZE
        try:
            response = self.kinesis_client.get_shard_iterator(
                StreamName=self.config.stream_name,
                ShardId=self.details['Shards'][0]['ShardId'],
                ShardIteratorType='TRIM_HORIZON',

            )
            shard_iter = response['ShardIterator']
            while True:
                response = self.kinesis_client.get_records(
                    ShardIterator=shard_iter,
                    Limit=batch_size,
                )
                shard_iter = response['NextShardIterator']
                records = response['Records']
                if records:
                    self._print(f'Got {len(records)} records. Sample: {records[0]}')
                    handler([json.loads(r['Data'].decode('utf-8')) for r in records])
        except Exception:
            self._print(f'Couldn\'t get records from stream {self.config.stream_name}.')
            raise

    def test_connection(self):
        return True
