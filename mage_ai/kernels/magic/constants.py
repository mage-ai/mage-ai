try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover


class ExecutionStatus(StrEnum):
    CANCELLED = 'cancelled'
    ERROR = 'error'
    FAILURE = 'failure'
    READY = 'ready'
    RUNNING = 'running'
    SUCCESS = 'success'


class EventStreamType(StrEnum):
    EXECUTION = 'execution'
    TASK = 'task'


class ResultType(StrEnum):
    DATA = 'data'
    STATUS = 'status'
    STDOUT = 'stdout'
