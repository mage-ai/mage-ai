import os
from dataclasses import asdict, dataclass
from typing import Dict

import inflection

from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.services.spark.constants import SPARK_DIRECTORY_NAME
from mage_ai.settings.repo import get_repo_path


@dataclass
class BaseSparkModel:
    @classmethod
    def load(self, **kwargs):
        return self(**self.load_to_dict(**kwargs))

    @classmethod
    def load_to_dict(self, **kwargs) -> Dict:
        data = {}
        for key, value in kwargs.items():
            data[inflection.underscore(key)] = value
        return data

    @classmethod
    def cache_dir_path(self) -> str:
        repo_config = get_repo_config(repo_path=get_repo_path())

        return os.path.join(
            repo_config.variables_dir,
            SPARK_DIRECTORY_NAME,
        )

    def to_dict(self) -> Dict:
        return asdict(self)
