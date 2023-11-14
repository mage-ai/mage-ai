import argparse
from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.utils import update_record_with_internal_columns
from mage_integrations.destinations.constants import KEY_RECORD
from mage_integrations.utils.dictionary import merge_dict
import sys
from kafka import KafkaProducer
import pandas as pd
import json

from typing import List, Dict

MAXIMUM_BATCH_SIZE_MB = 1

class Kafka(Destination):
    def test_connection(self) -> None:
        raise Exception('Not Implemented')

    def build_client(self):
        kwargs = dict(
            bootstrap_servers=self.config['bootstrap_server'],
            api_version=self.config.get('api_version', None),
            value_serializer=lambda x: json.dumps(x).encode('utf-8'),
            key_serializer=lambda x: x.encode('utf-8') if x else None,
        )
        producer = KafkaProducer(**kwargs)
        return producer

    def export_batch_data(self, record_data: List[Dict], stream: str, tags: Dict = None) -> None:
        
        self.logger.info('Export data started.')

        for r in record_data:
            r['record'] = update_record_with_internal_columns(r['record'])

        df = pd.DataFrame([d[KEY_RECORD] for d in record_data])
        df_count = len(df.index)

        idx = 0
        total_byte_size = int(df.memory_usage(deep=True).sum())
        tags2 = merge_dict(tags, dict(
            total_byte_size=total_byte_size,
        ))

        self.logger.info(f'Inserting records for batch {idx} started.', tags=tags2)

        value = df.to_json()

        producer = self.build_client()
        producer.send(self.config['topic'], value, key=self.config.get('key', None))
        self.logger.info('Message Sent')

        tags.update(records_inserted=df_count)

        self.logger.info('Export data completed.', tags=tags)


if __name__ == '__main__':
    destination = Kafka(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
