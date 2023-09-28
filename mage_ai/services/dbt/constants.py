from enum import Enum

DBT_CLOUD_BASE_URL = 'https://cloud.getdbt.com/api/v2/accounts'

DEFAULT_POLL_INTERVAL = 3


class DbtCloudJobRunStatus(Enum):
    QUEUED = 1
    STARTING = 2
    RUNNING = 3
    SUCCESS = 10
    ERROR = 20
    CANCELLED = 30
    TERMINAL_STATUSES = (SUCCESS, ERROR, CANCELLED)
