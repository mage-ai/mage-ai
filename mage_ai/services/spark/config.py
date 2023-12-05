from dataclasses import dataclass, field
from typing import Dict, List

from mage_ai.shared.config import BaseConfig


@dataclass
class SparkConfig(BaseConfig):
    app_name: str = None
    spark_master: str = None
    spark_home: str = None
    executor_env: Dict = field(default_factory=dict)
    spark_jars: List = field(default_factory=list)
    others: Dict = field(default_factory=dict)
    # Use custom session created manually and set in kwargs['context']
    use_custom_session: bool = False
    custom_session_var_name: str = 'spark'
