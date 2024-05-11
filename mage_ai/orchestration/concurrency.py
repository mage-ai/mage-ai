from dataclasses import dataclass

from mage_ai.settings.server import (
    CONCURRENCY_CONFIG_BLOCK_RUN_LIMIT,
    CONCURRENCY_CONFIG_PIPELINE_RUN_LIMIT,
)
from mage_ai.shared.config import BaseConfig


class OnLimitReached:
    WAIT = 'wait'
    SKIP = 'skip'


@dataclass
class ConcurrencyConfig(BaseConfig):
    block_run_limit: int = CONCURRENCY_CONFIG_BLOCK_RUN_LIMIT
    pipeline_run_limit: int = CONCURRENCY_CONFIG_PIPELINE_RUN_LIMIT
    pipeline_run_limit_all_triggers: int = None
    on_pipeline_run_limit_reached: OnLimitReached = OnLimitReached.WAIT
