try:
    # breaking change introduced in python 3.11
    from enum import Enum, IntEnum, StrEnum  # noqa: F401
except ImportError:  # pragma: no cover
    from enum import Enum, IntEnum  # noqa: F401 # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover
