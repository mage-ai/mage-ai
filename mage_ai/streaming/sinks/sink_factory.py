from typing import Dict

from mage_ai.streaming.constants import SinkType


class SinkFactory:
    @classmethod
    def get_sink(self, config: Dict, **kwargs):
        connector_type = config['connector_type']
        if connector_type == SinkType.AMAZON_S3:
            from mage_ai.streaming.sinks.amazon_s3 import AmazonS3Sink

            return AmazonS3Sink(config, **kwargs)
        elif connector_type == SinkType.DUMMY:
            from mage_ai.streaming.sinks.dummy import DummySink

            return DummySink(config, **kwargs)
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
        elif connector_type == SinkType.AZURE_DATA_LAKE:
            from mage_ai.streaming.sinks.azure_data_lake import AzureDataLakeSink

            return AzureDataLakeSink(config, **kwargs)
        raise Exception(
            f'Ingesting data to {connector_type} is not supported in streaming pipelines yet.',
        )
