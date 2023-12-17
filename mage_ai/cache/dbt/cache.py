from mage_ai.cache.base import BaseCache
from mage_ai.cache.constants import CACHE_KEY_DBT_PROJECTS_PROFILES_MODELS
from mage_ai.cache.dbt.utils import build_mapping
from mage_ai.settings.repo import get_repo_path


class DBTCache(BaseCache):
    cache_key = CACHE_KEY_DBT_PROJECTS_PROFILES_MODELS

    @classmethod
    async def initialize_cache(
        self,
        file_path: str = None,
        replace: bool = False,
        repo_path: str = None,
        root_project: bool = True,
    ) -> 'DBTCache':
        repo_path = repo_path or get_repo_path(root_project=root_project)
        cache = self(repo_path=repo_path)
        if replace or not cache.exists():
            await cache.initialize_cache_for_models(file_path=file_path)
        return cache

    async def initialize_cache_for_models(self, file_path: str = None) -> None:
        mapping = await build_mapping(file_path or get_repo_path(root_project=True))
        self.set(self.cache_key, mapping)
