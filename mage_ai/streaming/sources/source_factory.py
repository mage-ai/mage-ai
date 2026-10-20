from typing import Dict

from mage_ai.data_preparation.decorators import collect_decorated_objs
from mage_ai.streaming.constants import SourceType


class SourceFactory:
    @classmethod
    def get_source(self, config: Dict, **kwargs):
        connector_type = config['connector_type']
        if connector_type == SourceType.AMAZON_SQS:
            from mage_ai.streaming.sources.amazon_sqs import AmazonSqsSource

            return AmazonSqsSource(config, **kwargs)
        elif connector_type == SourceType.AZURE_EVENT_HUB:
            from mage_ai.streaming.sources.azure_event_hub import AzureEventHubSource

            return AzureEventHubSource(config, **kwargs)
        elif connector_type == SourceType.GOOGLE_CLOUD_PUBSUB:
            from mage_ai.streaming.sources.google_cloud_pubsub import (
                GoogleCloudPubSubSource,
            )

            return GoogleCloudPubSubSource(config, **kwargs)
        elif connector_type == SourceType.INFLUXDB:
            from mage_ai.streaming.sources.influxdb import InfluxDbSource

            return InfluxDbSource(config, **kwargs)
        elif connector_type == SourceType.KAFKA:
            from mage_ai.streaming.sources.kafka import KafkaSource

            return KafkaSource(config, **kwargs)
        elif connector_type == SourceType.NATS:
            from mage_ai.streaming.sources.nats_js import NATSSource

            return NATSSource(config, **kwargs)
        elif connector_type == SourceType.KINESIS:
            from mage_ai.streaming.sources.kinesis import KinesisSource

            return KinesisSource(config, **kwargs)
        elif connector_type == SourceType.RABBITMQ:
            from mage_ai.streaming.sources.rabbitmq import RabbitMQSource

            return RabbitMQSource(config, **kwargs)
        elif connector_type == SourceType.ACTIVEMQ:
            from mage_ai.streaming.sources.activemq import ActiveMQSource

            return ActiveMQSource(config, **kwargs)
        elif connector_type == SourceType.MONGODB:
            from mage_ai.streaming.sources.mongodb import MongoSource
            return MongoSource(config, **kwargs)
        raise Exception(
            f'Consuming data from {connector_type} is not supported in streaming pipelines yet.',
        )

    @classmethod
    def get_python_source(self, content: str, **kwargs):
        """
        Find the class that's decorated with streaming_source from the source code.

        Args:
            content (str): The python code that contains the streaming source implementation.
            **kwargs: {'global_vars': {...}}

        Returns:
            The initialized class object.

        Raises:
            Exception: Description
        """
        decorated_sources = []

        exec(content, {'streaming_source': collect_decorated_objs(decorated_sources)})

        if not decorated_sources:
            raise Exception('Not find the class that has streaming_source decorator.')

        return decorated_sources[0](**kwargs)
