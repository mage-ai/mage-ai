try:
    from enum import IntEnum, StrEnum
except ImportError:
    from enum import Enum, IntEnum

    class StrEnum(str, Enum):
        pass

__all__ = [
    "IntEnum",
    "StrEnum",
]
