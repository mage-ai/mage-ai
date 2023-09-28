from dataclasses import dataclass, field
from mage_ai.shared.config import BaseConfig
from typing import Dict, List


@dataclass
class SparkConfig(BaseConfig):
    app_name: str = None
    spark_master: str = None
    spark_home: str = None
    executor_env: Dict = field(default_factory=dict)
    spark_jars: List = field(default_factory=list)
    others: Dict = field(default_factory=dict)
