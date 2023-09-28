from dataclasses import dataclass, field
from enum import Enum
from typing import Dict

from mage_ai.shared.config import BaseConfig
from mage_ai.shared.logger import LoggingLevel


class LoggerType(str, Enum):
    DEFAULT = 'file'
    S3 = 's3'
    GCS = 'gcs'


@dataclass
class LoggingConfig(BaseConfig):
    type: LoggerType = LoggerType.DEFAULT
    level: LoggingLevel = LoggingLevel.INFO
    destination_config: Dict = field(default_factory=dict)
    # The period to keep the log files, e.g. '30d', '24h', '3w'
    retention_period: str = None
