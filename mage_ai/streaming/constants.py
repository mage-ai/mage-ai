from enum import Enum


class SourceType(str, Enum):
    AZURE_EVENT_HUB = 'azure_event_hub'
    KAFKA = 'kafka'
    KINESIS = 'kinesis'
    RABBITMQ = 'rabbitmq'


class SinkType(str, Enum):
    AMAZON_S3 = 'amazon_s3'
    KAFKA = 'kafka'
    KINESIS = 'kinesis'
    OPENSEARCH = 'opensearch'
