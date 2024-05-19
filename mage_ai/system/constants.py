from enum import Enum


class LogTag(str, Enum):
    GENERIC = 'GENERIC'
    MEMORY = 'MEMORY'
    METADATA = 'METADATA'
    METRICS = 'METRICS'
    PROCESS = 'PROCESS'


LOGS_DIRECTORY = 'logs'
SYSTEM_DIRECTORY = 'system'
