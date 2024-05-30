from enum import Enum


class ExecutionStatus(str, Enum):
    SUCCESS = 0
    FAILURE = 1
    ERROR = 2


class EventStreamType(str, Enum):
    EXECUTION = 'execution'
    EXECUTION_STATUS = 'execution_status'
    TASK = 'task'
    TASK_STATUS = 'task_status'
