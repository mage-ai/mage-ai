from dataclasses import dataclass
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.shared.config import BaseConfig


@dataclass
class SparkConfig(BaseConfig):
    pipeline: Pipeline = None
    repo_path: str = None
