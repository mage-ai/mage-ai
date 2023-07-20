from dataclasses import dataclass
from enum import Enum

from mage_ai.shared.config import BaseConfig


class QueueType(str, Enum):
    CELERY = 'celery'
    PROCESS = 'process'


@dataclass
class ProcessQueueConfig(BaseConfig):
    redis_url: str = None


@dataclass
class QueueConfig(BaseConfig):
    queue_type: QueueType = QueueType.PROCESS
    concurrency: int = 20
    process_queue_config: ProcessQueueConfig = None
