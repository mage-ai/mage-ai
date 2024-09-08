try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover


class Channel(StrEnum):
    TERMINAL = 'TERMINAL'


class ExecutionState(StrEnum):
    IDLE = 'idle'


class MessageType(StrEnum):
    DISPLAY_DATA = 'display_data'
