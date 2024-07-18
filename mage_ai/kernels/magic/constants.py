from enum import Enum


class ExecutionStatus(str, Enum):
    CANCELLED = 'cancelled'
    ERROR = 'error'
    FAILURE = 'failure'
    INIT = 'init'
    INTERRUPTED = 'interrupted'
    READY = 'ready'
    RESTARTED = 'restarted'
    RUNNING = 'running'
    SUCCESS = 'success'
    TERMINATED = 'terminated'


class EventStreamType(str, Enum):
    EXECUTION = 'execution'
    TASK = 'task'


class ResultType(str, Enum):
    DATA = 'data'
    OUTPUT = 'output'
    STATUS = 'status'
    STDOUT = 'stdout'
