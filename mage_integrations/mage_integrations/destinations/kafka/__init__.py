import argparse
import ast
import json
import sys

if sys.version_info >= (3, 12, 0):
    import six
    sys.modules['kafka.vendor.six.moves'] = six.moves

from typing import Dict, List

from kafka import KafkaConsumer, KafkaProducer
from mage_integrations.destinations.base import Destination
from mage_integrations.destinations.constants import KEY_RECORD
from mage_integrations.destinations.utils import update_record_with_internal_columns


class Kafka(Destination):

    def test_connection(self) -> None:
        consumer = KafkaConsumer(bootstrap_servers=self.config['bootstrap_server'],
                                 api_version=ast.literal_eval(self.config.get('api_version',
                                                                              '(0, 10, 2)')))
        topics = consumer.topics()

        if not topics:
            consumer.close()
            raise Exception('Kafka was not able to connect to BootStrap Server')
        elif topics:
            consumer.close()
            return True

    def build_client(self):
        kwargs = dict(
            bootstrap_servers=self.config['bootstrap_server'],
            api_version=ast.literal_eval(self.config.get('api_version', '(0, 10, 2)')),
            value_serializer=lambda x: json.dumps(x).encode('utf-8'),
            key_serializer=lambda x: x.encode('utf-8') if x else None,
        )
        producer = KafkaProducer(**kwargs)
        return producer

    def export_batch_data(self, record_data: List[Dict], stream: str, tags: Dict = None) -> None:

        self.logger.info('Export data started.')

        producer = self.build_client()

        if self.key_properties.get(stream) is not None and len(self.key_properties[stream]) >= 1:
            key_properties = self.key_properties[stream][0]
        else:
            key_properties = None

        self.logger.info('Inserting records started.')

        for r in record_data:
            r[KEY_RECORD] = update_record_with_internal_columns(r[KEY_RECORD])
            producer.send(self.config['topic'], r[KEY_RECORD], key=key_properties)

        self.logger.info('Export data completed')


if __name__ == '__main__':
    destination = Kafka(
        argument_parser=argparse.ArgumentParser(),
        batch_processing=True,
    )
    destination.process(sys.stdin.buffer)
