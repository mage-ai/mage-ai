from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig


@dataclass
class SparkConfig(BaseConfig):
    spark_config: dict = None
