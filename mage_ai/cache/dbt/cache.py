import os
from typing import List

from mage_ai.cache.base import BaseCache
from mage_ai.cache.constants import CACHE_KEY_DBT_PROJECTS_PROFILES_MODELS
from mage_ai.cache.dbt.constants import FileType, infer_file_type
from mage_ai.cache.dbt.models import DBTCacheItem
from mage_ai.cache.dbt.utils import (
    absolute_project_file_path,
    build_mapping,
    build_mapping_async,
    get_models,
    get_project_path_from_file_path,
    read_content,
    read_content_async,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.hash import merge_dict


class DBTCache(BaseCache):
    cache_key = CACHE_KEY_DBT_PROJECTS_PROFILES_MODELS

    @classmethod
    async def initialize_cache_async(
        self,
        file_path: str = None,
        replace: bool = False,
        repo_path: str = None,
        root_project: bool = True,
    ) -> 'DBTCache':
        repo_path = repo_path or get_repo_path(root_project=root_project)
        cache = self(repo_path=repo_path)
        if replace or not cache.exists():
            await cache.initialize_cache_for_models_async(file_path=file_path)
        return cache

    @classmethod
    def initialize_cache(
        self,
        file_path: str = None,
        replace: bool = False,
        repo_path: str = None,
        root_project: bool = True,
    ) -> 'DBTCache':
        repo_path = repo_path or get_repo_path(root_project=root_project)
        cache = self(repo_path=repo_path)
        if replace or not cache.exists():
            cache.initialize_cache_for_models(file_path=file_path)
        return cache

    def get_cache(self):
        return self.get(self.cache_key)

    def get_cache_items(self) -> List[DBTCacheItem]:
        mapping = self.get_cache() or {}

        return [DBTCacheItem.load(
            item=item,
            uuid=uuid,
        ) for uuid, item in mapping.items()]

    async def initialize_cache_for_models_async(
        self,
        file_path: str = None,
        update: bool = False,
    ) -> None:
        mapping = await build_mapping_async(file_path or get_repo_path(root_project=True))

        if update:
            mapping = merge_dict(
                self.get_cache(),
                mapping,
            )

        self.set(self.cache_key, mapping)

    def initialize_cache_for_models(
        self,
        file_path: str = None,
        update: bool = False,
    ) -> None:
        mapping = build_mapping(file_path or get_repo_path(root_project=True))

        if update:
            mapping = merge_dict(
                self.get_cache(),
                mapping,
            )

        self.set(self.cache_key, mapping)

    async def update_async(self, file_path: str) -> None:
        mapping = self.get_cache() or {}

        same_value = True
        file_type = infer_file_type(file_path)

        if FileType.PROJECT == file_type:
            project_path = os.path.dirname(file_path)
            if project_path:
                if project_path not in mapping:
                    mapping[project_path] = {}
                project = await read_content_async(file_path)
                same_value = mapping[project_path].get('project') == project
                mapping[project_path]['project'] = project
        elif FileType.PROFILES == file_type:
            project_path = get_project_path_from_file_path(file_path, walk_up_parents=True)
            if project_path:
                if project_path not in mapping:
                    mapping[project_path] = dict(
                        project=await read_content_async(
                            absolute_project_file_path(project_path),
                        ),
                    )
                profiles = await read_content_async(file_path)
                same_value = mapping[project_path].get('profiles') == profiles
                mapping[project_path]['profiles'] = profiles
        elif FileType.MODEL == file_type:
            project_path = get_project_path_from_file_path(file_path, walk_up_parents=True)
            if project_path:
                if project_path not in mapping:
                    mapping[project_path] = dict(
                        project=await read_content_async(
                            absolute_project_file_path(project_path),
                        ),
                    )
                project = (mapping.get(project_path) or {}).get('project')
                models = get_models(project=project)
                same_value = mapping[project_path].get('models') == models
                mapping[project_path]['models'] = models

        if not same_value:
            self.set(self.cache_key, mapping)

    def update(self, file_path: str) -> None:
        mapping = self.get_cache() or {}

        same_value = True
        file_type = infer_file_type(file_path)

        if FileType.PROJECT == file_type:
            project_path = os.path.dirname(file_path)
            if project_path:
                if project_path not in mapping:
                    mapping[project_path] = {}
                project = read_content(file_path)
                same_value = mapping[project_path].get('project') == project
                mapping[project_path]['project'] = project
        elif FileType.PROFILES == file_type:
            project_path = get_project_path_from_file_path(file_path, walk_up_parents=True)
            if project_path:
                if project_path not in mapping:
                    mapping[project_path] = dict(
                        project=read_content(
                            absolute_project_file_path(project_path),
                        ),
                    )
                profiles = read_content(file_path)
                same_value = mapping[project_path].get('profiles') == profiles
                mapping[project_path]['profiles'] = profiles
        elif FileType.MODEL == file_type:
            project_path = get_project_path_from_file_path(file_path, walk_up_parents=True)
            if project_path:
                if project_path not in mapping:
                    mapping[project_path] = dict(
                        project=read_content(
                            absolute_project_file_path(project_path),
                        ),
                    )
                project = (mapping.get(project_path) or {}).get('project')
                models = get_models(project=project)
                same_value = mapping[project_path].get('models') == models
                mapping[project_path]['models'] = models

        if not same_value:
            self.set(self.cache_key, mapping)
