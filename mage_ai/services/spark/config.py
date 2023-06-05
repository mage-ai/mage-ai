from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig


@dataclass
class SparkConfig(BaseConfig):
    pipeline_path: str = None
    repo_path: str = None
