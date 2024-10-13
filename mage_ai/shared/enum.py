try:
    # breaking change introduced in python 3.11
    from enum import Enum, IntEnum, StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class IntEnum(int, Enum):  # pragma: no cover
        pass  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover
