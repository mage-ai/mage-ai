import enum


API_ENDPOINT = 'https://api.mage.ai/v1/usage_statistics'


class EventActionType(str, enum.Enum):
    IMPRESSION = 'impression'


class EventObjectType(str, enum.Enum):
    ERROR = 'error'
    PIPELINE = 'pipeline'
    PIPELINE_RUN = 'pipeline_run'
    PROJECT = 'project'
    USER = 'user'
