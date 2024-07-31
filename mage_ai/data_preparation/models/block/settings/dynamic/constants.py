from enum import Enum

DEFAULT_STREAM_POLL_INTERVAL = 60


class ModeType(str, Enum):
    DEFAULT = 'default'
    STREAM = 'stream'
