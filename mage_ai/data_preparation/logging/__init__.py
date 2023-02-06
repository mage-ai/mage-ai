from dataclasses import dataclass, field
from enum import Enum
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.logger import LoggingLevel
from typing import Dict


class LoggerType(str, Enum):
    DEFAULT = 'file'
    S3 = 's3'
    GCS = 'gcs'


@dataclass
class LoggingConfig(BaseConfig):
    type: LoggerType = LoggerType.DEFAULT
    level: LoggingLevel = LoggingLevel.INFO
    destination_config: Dict = field(default_factory=dict)
