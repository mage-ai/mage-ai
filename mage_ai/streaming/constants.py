from enum import Enum


class SourceType(str, Enum):
    KAFKA = 'kafka'


class SinkType(str, Enum):
    OPENSEARCH = 'opensearch'
