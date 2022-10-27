from enum import Enum


class SourceType(str, Enum):
    AZURE_EVENT_HUB = 'azure_event_hub'
    KAFKA = 'kafka'


class SinkType(str, Enum):
    OPENSEARCH = 'opensearch'
