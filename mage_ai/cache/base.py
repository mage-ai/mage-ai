import os
from typing import Any, Dict, List, Union

from mage_ai.cache.constants import (
    MAGE_CACHE_DIRECTORY_DEFAULT,
    MAGE_CACHE_DIRECTORY_ENVIRONMENT_VARIABLE_NAME,
)
from mage_ai.data_preparation.repo_manager import RepoConfig, get_repo_config
from mage_ai.data_preparation.storage.local_storage import LocalStorage
from mage_ai.settings.repo import get_repo_path, get_variables_dir


class BaseCache():
    cache_key = None

    def __init__(self, repo_path: str = None, repo_config=None, root_project: bool = True):
        self.root_project = root_project
        self.repo_path = repo_path or get_repo_path(root_project=self.root_project)

        if repo_config is None:
            self.repo_config = get_repo_config(
                repo_path=self.repo_path,
                root_project=self.root_project,
            )
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

    def get(self, key: str = None, refresh: bool = False, **kwargs) -> Union[Dict, List]:
        if refresh or not self._temp_data:
            self._temp_data = self.storage.read_json_file(
                self.build_path(key or self.cache_key),
                None,
            )

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
            get_variables_dir(repo_path=self.repo_path, root_project=self.root_project),
            MAGE_CACHE_DIRECTORY_DEFAULT,
        )

        return os.path.join(dir_path, key)

    def invalidate(self, key: str = None) -> None:
        path = self.build_path(key or self.cache_key)
        if self.storage.path_exists(path):
            self.storage.remove(path)

    @property
    def file_path(self) -> str:
        return self.build_path(self.cache_key)
