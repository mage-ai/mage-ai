try:
    # breaking change introduced in python 3.11
    from enum import StrEnum
except ImportError:  # pragma: no cover
    from enum import Enum  # pragma: no cover

    class StrEnum(str, Enum):  # pragma: no cover
        pass  # pragma: no cover

from dataclasses import dataclass, field
from typing import Dict

from mage_ai.shared.config import BaseConfig
from mage_ai.shared.logger import LoggingLevel


class LoggerType(StrEnum):
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
