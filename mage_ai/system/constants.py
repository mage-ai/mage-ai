from enum import Enum


class LogType(str, Enum):
    END = 'END'
    GENERIC = 'GENERIC'
    MEMORY = 'MEMORY'
    METRICS = 'METRICS'
    PROCESS = 'PROCESS'
    START = 'START'


METRICS_DIRECTORY = 'metrics'
SYSTEM_DIRECTORY = 'system'
