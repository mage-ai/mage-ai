try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

DEFAULT_STREAM_POLL_INTERVAL = 60


class ModeType(StrEnum):
    DEFAULT = 'default'
    STREAM = 'stream'
