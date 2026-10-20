from mage_ai.shared.enum import StrEnum

SPARK_DIRECTORY_NAME = '.spark'


class ComputeServiceUUID(StrEnum):
    AWS_EMR = 'AWS_EMR'
    STANDALONE_CLUSTER = 'STANDALONE_CLUSTER'


class SparkMaster(StrEnum):
    LOCAL = 'local'
