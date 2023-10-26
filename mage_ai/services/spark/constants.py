from enum import Enum


class ComputeService(str, Enum):
    AWS_EMR = 'AWS_EMR'
    STANDALONE_CLUSTER = 'STANDALONE_CLUSTER'


class SparkMaster(str, Enum):
    LOCAL = 'local'
