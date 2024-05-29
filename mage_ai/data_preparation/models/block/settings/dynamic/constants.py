from enum import Enum

DEFAULT_STREAM_POLL_INTERVAL = 60


class ModeType(str, Enum):
    STREAM = 'stream'
