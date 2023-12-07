import os
from typing import Any, Dict, List, Union

from mage_ai.cache.constants import (
    MAGE_CACHE_DIRECTORY_DEFAULT,
    MAGE_CACHE_DIRECTORY_ENVIRONMENT_VARIABLE_NAME,
)
from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_config
from mage_ai.data_preparation.storage.local_storage import LocalStorage
from mage_ai.settings.repo import get_repo_path


class BaseCache():
    cache_key = None

    def __init__(self, repo_path: str = None, repo_config=None):
        self.repo_path = repo_path or get_repo_path()

        if repo_config is None:
            self.repo_config = get_repo_config(repo_path=self.repo_path)
        elif type(repo_config) is dict:
            self.repo_config = RepoConfig.from_dict(repo_config)
        else:
            self.repo_config = repo_config

        self._storage = None
        self._temp_data = None

    @property
    def storage(self) -> LocalStorage:
        if not self._storage:
            self._storage = LocalStorage()

        return self._storage

    def exists(self) -> bool:
        return self.get(self.cache_key) is not None

    def get(self, key: str, refresh: bool = False, **kwargs) -> Union[Dict, List]:
        if refresh or not self._temp_data:
            self._temp_data = self.storage.read_json_file(self.build_path(key), None)

        if self._temp_data:
            return self._temp_data

        return self._temp_data

    def load_all_data(self):
        return self.get(self.cache_key)

    def set(self, key: str, value: Any) -> None:
        self.storage.write_json_file(self.build_path(key), value)

    def get_set(self, key: str, value: Any) -> Union[Dict, List]:
        value_fetched = self.get(key)

        if value_fetched is None:
            self.set(key, value)
            value_fetched = value

        return value_fetched

    def build_path(self, key: str) -> str:
        dir_path = os.getenv(MAGE_CACHE_DIRECTORY_ENVIRONMENT_VARIABLE_NAME) or os.path.join(
            self.repo_config.variables_dir,
            MAGE_CACHE_DIRECTORY_DEFAULT,
        )

        return os.path.join(dir_path, key)
