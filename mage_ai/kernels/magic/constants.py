from enum import Enum


class ExecutionStatus(str, Enum):
    ERROR = 'error'
    FAILURE = 'failure'
    RUNNING = 'running'
    SUCCESS = 'success'


class EventStreamType(str, Enum):
    EXECUTION = 'execution'
    EXECUTION_STATUS = 'execution_status'
    TASK = 'task'
    TASK_STATUS = 'task_status'


class ResultType(str, Enum):
    DATA = 'data'
    STDOUT = 'stdout'
