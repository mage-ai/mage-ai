from mage_ai.shared.enum import StrEnum


class LogType(StrEnum):
    END = 'END'
    GENERIC = 'GENERIC'
    MEMORY = 'MEMORY'
    METRICS = 'METRICS'
    PROCESS = 'PROCESS'
    START = 'START'


METRICS_DIRECTORY = 'metrics'
SYSTEM_DIRECTORY = 'system'
