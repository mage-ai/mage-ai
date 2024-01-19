from enum import Enum


class Channel(str, Enum):
    CODE = 'CODE'


class ExecutionState(str, Enum):
    IDLE = 'idle'


class MessageType(str, Enum):
    DISPLAY_DATA = 'display_data'


class MsgType:
    DISPLAY_DATA = 'display_data'
    ERROR = 'error'
    EXECUTE_INPUT = 'execute_input'
    EXECUTE_RESULT = 'execute_result'
    EXECUTE_REQUEST = 'execute_request'
    IDLE = 'idle'
    SHUTDOWN_REQUEST = 'shutdown_request'
    STATUS = 'status'
    STREAM = 'stream'
    STREAM_PIPELINE = 'stream_pipeline'
    USAGE_REQUEST = 'usage_request'
