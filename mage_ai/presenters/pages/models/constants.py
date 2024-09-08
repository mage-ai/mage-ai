try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover


class ComponentCategory(StrEnum):
    BUTTON = 'button'
    FIELD = 'field'
    FORM = 'form'


class PageCategory(StrEnum):
    COMMUNITY = 'community'


class ResourceType(StrEnum):
    PIPELINE = 'pipeline'
    PIPELINE_SCHEDULE = 'pipeline_schedule'
