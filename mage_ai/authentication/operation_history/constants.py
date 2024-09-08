try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

MAGE_OPERATION_HISTORY_DIRECTORY_DEFAULT = '.operation_history'
MAGE_OPERATION_HISTORY_DIRECTORY_ENVIRONMENT_VARIABLE_NAME = 'MAGE_OPERATION_HISTORY_DIRECTORY'


class ResourceType(StrEnum):
    PIPELINE = 'pipeline'
