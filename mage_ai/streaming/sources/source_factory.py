from mage_ai.streaming.constants import SourceType
from typing import Dict


class SourceFactory:
    @classmethod
    def get_source(self, config: Dict):
        connector_type = config['connector_type']
        if connector_type == SourceType.KAFKA:
            from mage_ai.streaming.sources.kafka import KafkaSource
            return KafkaSource(config)
