try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover


class LogType(StrEnum):
    END = 'END'
    GENERIC = 'GENERIC'
    MEMORY = 'MEMORY'
    METRICS = 'METRICS'
    PROCESS = 'PROCESS'
    START = 'START'


METRICS_DIRECTORY = 'metrics'
SYSTEM_DIRECTORY = 'system'
