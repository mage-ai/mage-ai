try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

DBT_DIRECTORY_NAME = 'dbt'

SQL_SERVER_ADAPTER_NAME = 'SQLServerAdapter'
SYNAPSE_ADAPTER_NAME = 'SynapseAdapter'
FABRIC_ADAPTER_NAME = 'FabricAdapter'

SKIP_LIMIT_ADAPTER_NAMES = [
    FABRIC_ADAPTER_NAME,
    SQL_SERVER_ADAPTER_NAME,
    SYNAPSE_ADAPTER_NAME,
]


class Flag(StrEnum):
    PROFILES_DIR = 'profiles-dir'
    PROJECT_DIR = 'project-dir'


class LogLevel(StrEnum):
    DEBUG = 'debug'
    INFO = 'info'
    WARN = 'warn'
    ERROR = 'error'
