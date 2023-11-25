from enum import Enum

DEFAULT_BATCH_SIZE = 100
DEFAULT_TIMEOUT_MS = 500


class SourceType(str, Enum):
    ACTIVEMQ = 'activemq'
    AMAZON_SQS = 'amazon_sqs'
    AZURE_EVENT_HUB = 'azure_event_hub'
    GOOGLE_CLOUD_PUBSUB = 'google_cloud_pubsub'
    INFLUXDB = 'influxdb'
    KAFKA = 'kafka'
    NATS = 'nats'
    KINESIS = 'kinesis'
    RABBITMQ = 'rabbitmq'
    MONGODB = 'mongodb'


class SinkType(str, Enum):
    ACTIVEMQ = 'activemq'
    AMAZON_S3 = 'amazon_s3'
    AZURE_DATA_LAKE = 'azure_data_lake'
    BIGQUERY = 'bigquery'
    CLICKHOUSE = 'clickhouse'
    DRUID = 'druid'
    DUCKDB = 'duckdb'
    DUMMY = 'dummy'
    ELASTICSEARCH = 'elasticsearch'
    GOOGLE_CLOUD_PUBSUB = 'google_cloud_pubsub'
    GOOGLE_CLOUD_STORAGE = 'google_cloud_storage'
    INFLUXDB = 'influxdb'
    KAFKA = 'kafka'
    KINESIS = 'kinesis'
    MONGODB = 'mongodb'
    MSSQL = 'mssql'
    MYSQL = 'mysql'
    OPENSEARCH = 'opensearch'
    ORACLEDB = 'oracledb'
    POSTGRES = 'postgres'
    RABBITMQ = 'rabbitmq'
    REDSHIFT = 'redshift'
    SNOWFLAKE = 'snowflake'
    TRINO = 'trino'


GENERIC_IO_SINK_TYPES = frozenset([
    SinkType.BIGQUERY,
    SinkType.CLICKHOUSE,
    SinkType.DUCKDB,
    SinkType.MSSQL,
    SinkType.MYSQL,
    SinkType.REDSHIFT,
    SinkType.SNOWFLAKE,
    SinkType.TRINO,
])
