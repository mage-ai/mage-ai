from dataclasses import dataclass, field
from enum import Enum
from mage_ai.shared.config import BaseConfig
from typing import Dict


class LoggerType(str, Enum):
    DEFAULT = 'file'
    S3 = 's3'


class Level(str, Enum):
    DEBUG = 'DEBUG'
    INFO = 'INFO'
    WARNING = 'WARNING'
    ERROR = 'ERROR'
    CRITICAL = 'CRITICAL'


@dataclass
class LoggingConfig(BaseConfig):
    type: LoggerType = LoggerType.DEFAULT
    level: Level = Level.INFO
    destination_config: Dict = field(default_factory=dict)
