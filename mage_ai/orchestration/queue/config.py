from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from enum import Enum


class QueueType(str, Enum):
    CELERY = 'celery'
    PROCESS = 'process'


@dataclass
class QueueConfig(BaseConfig):
    queue_type: QueueType = QueueType.PROCESS
    concurrency: int = 20
