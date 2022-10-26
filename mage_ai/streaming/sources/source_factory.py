from mage_ai.streaming.constants import SourceType
from typing import Dict


class SourceFactory:
    @classmethod
    def get_source(self, config: Dict):
        connector_type = config['connector_type']
        if connector_type == SourceType.KAFKA:
            from mage_ai.streaming.sources.kafka import KafkaSource
            return KafkaSource(config)
        elif connector_type == SourceType.AZURE_EVENT_HUB:
            from mage_ai.streaming.sources.azure_event_hub import AzureEventHubSource
            return AzureEventHubSource(config)
        raise Exception(
            f'Consuming data from {connector_type} is not supported in streaming pipelines yet.',
        )
