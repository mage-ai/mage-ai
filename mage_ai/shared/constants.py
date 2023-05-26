from enum import Enum

ENV_DEV = 'dev'
ENV_PROD = 'prod'
ENV_STAGING = 'staging'
ENV_TEST = 'test'

SAMPLE_SIZE = 1000

S3_PREFIX = 's3://'


class InstanceType(str, Enum):
    SERVER_AND_SCHEDULER = 'server_and_scheduler'
    SCHEDULER = 'scheduler'
    WEB_SERVER = 'web_server'
