from mage_ai.shared.enum import StrEnum


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
