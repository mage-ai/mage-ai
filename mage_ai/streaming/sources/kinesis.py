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
            shard_iterators = dict()
            for shard_id in self.details['Shards']:
                shard_id = shard_id['ShardId']
                iterator_kwargs = dict(
                    ShardIteratorType='LATEST',
                )
                if self.checkpoint is not None and self.checkpoint.get(shard_id):
                    iterator_kwargs = dict(
                        ShardIteratorType='AFTER_SEQUENCE_NUMBER',
                        StartingSequenceNumber=self.checkpoint.get(shard_id),
                    )
                self._print(f'Shard {shard_id} args: {iterator_kwargs}')
                shard_iterator = self.kinesis_client.get_shard_iterator(
                    StreamName=self.config.stream_name,
                    ShardId=shard_id,
                    **iterator_kwargs,
                )
                shard_iterators[shard_id] = shard_iterator['ShardIterator']
            self._print(f'Consuming messages from shards: {list(shard_iterators.keys())}')
            closed_streams = set()
            while True:
                for shard_id, shard_iter in shard_iterators.items():
                    if shard_id in closed_streams:
                        continue
                    response = self.kinesis_client.get_records(
                        ShardIterator=shard_iter,
                        Limit=batch_size,
                    )
                    if 'NextShardIterator' not in response:
                        self._print(f'Shards {shard_id} is closed.')
                        closed_streams.add(shard_id)
                        continue
                    shard_iterators[shard_id] = response['NextShardIterator']
                    records = response['Records']
                    if records:
                        self._print(f'Got {len(records)} records from shard {shard_id}. '
                                    f'Sample: {records[0]}')
                        handler([json.loads(r['Data'].decode('utf-8')) for r in records])
                        max_seq_number = max(r['SequenceNumber'] for r in records)
                        self.update_checkpoint(shard_id, max_seq_number)
                if len(closed_streams) == len(shard_iterators):
                    self._print(f'All shards {list(shard_iterators.keys())} are closed.')
                    break
        except Exception:
            self._print(f'Couldn\'t get records from stream {self.config.stream_name}.')
            raise

    def update_checkpoint(self, shard_id, sequence_number):
        if self.checkpoint is None:
            self.checkpoint = {}
        if not self.checkpoint.get(shard_id):
            self.checkpoint[shard_id] = sequence_number
        elif sequence_number > self.checkpoint.get(shard_id):
            self.checkpoint[shard_id] = sequence_number
        super().update_checkpoint()
