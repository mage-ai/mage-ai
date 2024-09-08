try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

API_ENDPOINT = 'https://api.mage.ai/v1/usage_statistics'


class EventNameType(StrEnum):
    API_ERROR = 'api_error'
    APPLICATION_ERROR = 'application_error'
    BLOCK_RUN_ENDED = 'block_run_ended'
    BLOCK_RUN_ERROR = 'block_run_error'
    FRONTEND_ERROR = 'frontend_error'
    PIPELINE_RUN_ENDED = 'pipeline_run_ended'
    USAGE_STATISTIC_CREATE = 'usage_statistic.create'


class EventActionType(StrEnum):
    CREATE = 'create'
    DENY = 'deny'
    EXECUTE = 'execute'
    IMPRESSION = 'impression'


class EventObjectType(StrEnum):
    BLOCK = 'block'
    BLOCK_RUN = 'block_run'
    CHART = 'chart'
    CUSTOM_TEMPLATE = 'custom_template'
    ERROR = 'error'
    FEATURE = 'feature'
    PIPELINE = 'pipeline'
    PIPELINE_RUN = 'pipeline_run'
    PROJECT = 'project'
    USER = 'user'
