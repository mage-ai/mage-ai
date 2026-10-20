import traceback
from dataclasses import dataclass

from mage_ai.shared.config import BaseConfig
from mage_ai.shared.enum import StrEnum

DEFAULT_CONCURRENCY = 20


class QueueType(StrEnum):
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
