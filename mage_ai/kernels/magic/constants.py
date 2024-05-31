from enum import Enum


class ExecutionStatus(str, Enum):
    CANCELLED = 'cancelled'
    ERROR = 'error'
    FAILURE = 'failure'
    READY = 'ready'
    RUNNING = 'running'
    SUCCESS = 'success'


class EventStreamType(str, Enum):
    EXECUTION = 'execution'
    TASK = 'task'


class ResultType(str, Enum):
    DATA = 'data'
    STATUS = 'status'
    STDOUT = 'stdout'
