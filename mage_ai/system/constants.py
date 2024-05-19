from enum import Enum


class LogType(str, Enum):
    GENERIC = 'GENERIC'
    INITIAL = 'INITIAL'
    MEMORY = 'MEMORY'
    METRICS = 'METRICS'
    PROCESS = 'PROCESS'


LOGS_DIRECTORY = 'logs'
SYSTEM_DIRECTORY = 'system'
