from enum import Enum

SPARK_DIRECTORY_NAME = '.spark'


class ComputeServiceUUID(str, Enum):
    AWS_EMR = 'AWS_EMR'
    STANDALONE_CLUSTER = 'STANDALONE_CLUSTER'


class SparkMaster(str, Enum):
    LOCAL = 'local'
