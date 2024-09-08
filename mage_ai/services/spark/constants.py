try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

SPARK_DIRECTORY_NAME = '.spark'


class ComputeServiceUUID(StrEnum):
    AWS_EMR = 'AWS_EMR'
    STANDALONE_CLUSTER = 'STANDALONE_CLUSTER'


class SparkMaster(StrEnum):
    LOCAL = 'local'
