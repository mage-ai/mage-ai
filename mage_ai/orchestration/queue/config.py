import traceback
from dataclasses import dataclass
from enum import Enum

from mage_ai.shared.config import BaseConfig

DEFAULT_CONCURRENCY = 20


class QueueType(str, Enum):
    CELERY = 'celery'
    PROCESS = 'process'


@dataclass
class ProcessQueueConfig(BaseConfig):
    redis_url: str = None


@dataclass
class QueueConfig(BaseConfig):
    queue_type: QueueType = QueueType.PROCESS
    concurrency: int = DEFAULT_CONCURRENCY
    process_queue_config: ProcessQueueConfig = None

    def __post_init__(self):
        try:
            self.concurrency = int(self.concurrency)
        except Exception:
            traceback.print_exc()
            self.concurrency = DEFAULT_CONCURRENCY
