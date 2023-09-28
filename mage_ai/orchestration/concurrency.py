from dataclasses import dataclass

from mage_ai.shared.config import BaseConfig


@dataclass
class ConcurrencyConfig(BaseConfig):
    pipeline_run_limit: int = None
    block_run_limit: int = None
