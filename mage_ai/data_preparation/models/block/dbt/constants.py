from enum import Enum

DBT_DIRECTORY_NAME = 'dbt'

SQL_SERVER_ADAPTER_NAME = 'SQLServerAdapter'
SYNAPSE_ADAPTER_NAME = 'SynapseAdapter'
FABRIC_ADAPTER_NAME = 'FabricAdapter'

SKIP_LIMIT_ADAPTER_NAMES = [
    FABRIC_ADAPTER_NAME,
    SQL_SERVER_ADAPTER_NAME,
    SYNAPSE_ADAPTER_NAME,
]


class Flag(str, Enum):
    PROFILES_DIR = 'profiles-dir'
    PROJECT_DIR = 'project-dir'


class LogLevel(str, Enum):
    DEBUG = 'debug'
    INFO = 'info'
    WARN = 'warn'
    ERROR = 'error'
