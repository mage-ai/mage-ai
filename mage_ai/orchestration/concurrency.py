from dataclasses import dataclass

from mage_ai.shared.config import BaseConfig


class OnLimitReached:
    WAIT = 'wait'
    SKIP = 'skip'


@dataclass
class ConcurrencyConfig(BaseConfig):
    block_run_limit: int = None
    pipeline_run_limit: int = None
    pipeline_run_limit_all_triggers: int = None
    on_pipeline_run_limit_reached: OnLimitReached = OnLimitReached.WAIT
