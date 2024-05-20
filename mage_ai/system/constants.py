from enum import Enum


class LogType(str, Enum):
    END = 'END'
    GENERIC = 'GENERIC'
    MEMORY = 'MEMORY'
    METRICS = 'METRICS'
    PROCESS = 'PROCESS'
    START = 'START'


LOGS_DIRECTORY = 'logs'
SYSTEM_DIRECTORY = 'system'
