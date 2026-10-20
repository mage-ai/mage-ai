from dataclasses import dataclass, fields
from typing import Dict

from mage_ai.settings.server import (
    CONCURRENCY_CONFIG_BLOCK_RUN_LIMIT,
    CONCURRENCY_CONFIG_PIPELINE_RUN_LIMIT,
)
from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import extract


class OnLimitReached:
    WAIT = 'wait'
    SKIP = 'skip'


@dataclass
class ConcurrencyConfig(BaseConfig):
    block_run_limit: int = CONCURRENCY_CONFIG_BLOCK_RUN_LIMIT
    pipeline_run_limit: int = CONCURRENCY_CONFIG_PIPELINE_RUN_LIMIT
    pipeline_run_limit_all_triggers: int = None
    on_pipeline_run_limit_reached: OnLimitReached = OnLimitReached.WAIT

    @classmethod
    def parse_config(cls, config: Dict = None) -> Dict:
        config = config or {}
        return extract(config, [field.name for field in fields(cls)])
