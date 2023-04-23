from enum import Enum

DEFAULT_BATCH_SIZE = 100


class SourceType(str, Enum):
    AMAZON_SQS = 'amazon_sqs'
    AZURE_EVENT_HUB = 'azure_event_hub'
    GOOGLE_CLOUD_PUBSUB = 'google_cloud_pubsub'
    KAFKA = 'kafka'
    KINESIS = 'kinesis'
    RABBITMQ = 'rabbitmq'


class SinkType(str, Enum):
    AMAZON_S3 = 'amazon_s3'
    DUMMY = 'dummy'
    KAFKA = 'kafka'
    KINESIS = 'kinesis'
    MONGODB = 'mongodb'
    OPENSEARCH = 'opensearch'
