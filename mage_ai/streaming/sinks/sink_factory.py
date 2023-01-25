from mage_ai.streaming.constants import SinkType
from typing import Dict


class SinkFactory:
    @classmethod
    def get_sink(self, config: Dict):
        connector_type = config['connector_type']
        if connector_type == SinkType.OPENSEARCH:
            from mage_ai.streaming.sinks.opensearch import OpenSearchSink
            return OpenSearchSink(config)
        elif connector_type == SinkType.KINESIS:
            from mage_ai.streaming.sinks.kinesis import KinesisSink
            return KinesisSink(config)
        raise Exception(
            f'Ingesting data to {connector_type} is not supported in streaming pipelines yet.',
        )
