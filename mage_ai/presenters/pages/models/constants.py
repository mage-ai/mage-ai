from enum import Enum


class ComponentCategory(str, Enum):
    BUTTON = 'button'
    FORM = 'form'


class PageCategory(str, Enum):
    COMMUNITY = 'community'


class ResourceType(str, Enum):
    PIPELINE = 'pipeline'
    PIPELINE_SCHEDULE = 'pipeline_schedule'
