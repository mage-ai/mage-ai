from typing import Dict

from mage_ai.streaming.constants import GENERIC_IO_SINK_TYPES, SinkType


class SinkFactory:
    @classmethod
    def get_sink(self, config: Dict, **kwargs):
        connector_type = config['connector_type']
        if connector_type == SinkType.ACTIVEMQ:
            from mage_ai.streaming.sinks.activemq import ActiveMQSink

            return ActiveMQSink(config, **kwargs)
        elif connector_type == SinkType.AMAZON_S3:
            from mage_ai.streaming.sinks.amazon_s3 import AmazonS3Sink

            return AmazonS3Sink(config, **kwargs)
        elif connector_type == SinkType.AZURE_DATA_LAKE:
            from mage_ai.streaming.sinks.azure_data_lake import AzureDataLakeSink

            return AzureDataLakeSink(config, **kwargs)
        elif connector_type == SinkType.DUMMY:
            from mage_ai.streaming.sinks.dummy import DummySink

            return DummySink(config, **kwargs)
        elif connector_type == SinkType.ELASTICSEARCH:
            from mage_ai.streaming.sinks.elasticsearch import ElasticSearchSink

            return ElasticSearchSink(config, **kwargs)
        elif connector_type == SinkType.GOOGLE_CLOUD_PUBSUB:
            from mage_ai.streaming.sinks.google_cloud_pubsub import (
                GoogleCloudPubSubSink,
            )

            return GoogleCloudPubSubSink(config, **kwargs)
        elif connector_type == SinkType.GOOGLE_CLOUD_STORAGE:
            from mage_ai.streaming.sinks.google_cloud_storage import (
                GoogleCloudStorageSink,
            )

            return GoogleCloudStorageSink(config, **kwargs)
        elif connector_type == SinkType.INFLUXDB:
            from mage_ai.streaming.sinks.influxdb import InfluxDbSink

            return InfluxDbSink(config, **kwargs)
        elif connector_type == SinkType.KAFKA:
            from mage_ai.streaming.sinks.kafka import KafkaSink

            return KafkaSink(config, **kwargs)
        elif connector_type == SinkType.KINESIS:
            from mage_ai.streaming.sinks.kinesis import KinesisSink

            return KinesisSink(config, **kwargs)
        elif connector_type == SinkType.MONGODB:
            from mage_ai.streaming.sinks.mongodb import MongoDbSink

            return MongoDbSink(config, **kwargs)
        elif connector_type == SinkType.OPENSEARCH:
            from mage_ai.streaming.sinks.opensearch import OpenSearchSink

            return OpenSearchSink(config, **kwargs)
        elif connector_type == SinkType.POSTGRES:
            from mage_ai.streaming.sinks.postgres import PostgresSink

            return PostgresSink(config, **kwargs)
        elif connector_type == SinkType.RABBITMQ:
            from mage_ai.streaming.sinks.rabbitmq import RabbitMQSink

            return RabbitMQSink(config, **kwargs)
        elif connector_type in GENERIC_IO_SINK_TYPES:
            from mage_ai.streaming.sinks.generic_io import GenericIOSink

            return GenericIOSink(config, **kwargs)
        raise Exception(
            f'Ingesting data to {connector_type} is not supported in streaming pipelines yet.',
        )
