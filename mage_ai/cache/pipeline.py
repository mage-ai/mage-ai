import asyncio
from datetime import datetime
from typing import Any, Dict, List, Union

from mage_ai.cache.base import BaseCache
from mage_ai.cache.constants import CACHE_KEY_PIPELINE_DETAILS_MAPPING
from mage_ai.cache.utils import build_pipeline_dict, group_models_by_keys
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.path_fixer import remove_base_repo_path_or_name


class PipelineCache(BaseCache):
    cache_key = CACHE_KEY_PIPELINE_DETAILS_MAPPING

    @classmethod
    async def initialize_cache(
        self,
        replace: bool = False,
        pipelines: List[Dict] = None,
    ) -> 'PipelineCache':
        cache = self()
        if replace or not cache.exists():
            await cache.initialize_cache_for_models(pipelines=pipelines)

        return cache

    def get(self, key: str, include_all: bool = False, **kwargs) -> Union[Dict, List]:
        mapping = super().get(key, **kwargs) or {}

        if include_all:
            return mapping

        return mapping.get('models')

    def set(self, key: str, value: Any) -> None:
        groups = group_models_by_keys(
            [model_dict.get('pipeline') for model_dict in value.values()],
            ['type'],
            self.build_key
        )

        super().set(key, dict(
            groups=groups,
            models=value,
        ))

    def build_key(self, pipeline: Union[Dict], repo_path: str = None) -> str:
        pipeline_uuid = ''

        if isinstance(pipeline, dict):
            pipeline_uuid = pipeline.get('uuid')
            if not repo_path:
                repo_path = pipeline.get('repo_path')
        else:
            pipeline_uuid = pipeline.uuid
            if not repo_path:
                repo_path = pipeline.repo_path

        if not pipeline_uuid:
            return None

        if not self.root_project:
            return pipeline_uuid

        if not repo_path:
            repo_path = get_repo_path(root_project=False)

        return ':'.join([remove_base_repo_path_or_name(repo_path), pipeline_uuid])

    def get_model(self, model) -> Dict:
        model_dict = {}

        mapping = self.get(self.cache_key)
        if mapping is not None:
            key = self.build_key(model)
            if key:
                model_dict = mapping.get(key, {})

        return model_dict

    def get_models(self, types: List[str]) -> List[Dict]:
        uuids = set()
        mapping = self.get(self.cache_key, include_all=True)
        models = mapping.get('models') or {}
        groups = mapping.get('groups') or {}
        for key in types:
            arr = (groups.get('type') or {}).get(key) or []
            if arr:
                uuids.update(arr)
        return [models.get(key) for key in uuids]

    def update_models(
        self,
        pipelines,
        added_at: str = None,
    ) -> None:
        mapping = self.get(self.cache_key)
        if mapping is None:
            mapping = {}

        for pipeline in pipelines:
            key = self.build_key(pipeline)
            if not key:
                continue

            mapping[key] = build_pipeline_dict(
                pipeline,
                added_at=added_at,
                include_details=True,
            )

        self.set(self.cache_key, mapping)

    def update_model(
        self,
        pipeline,
        added_at: str = None,
    ) -> None:
        self.update_models([pipeline], added_at)

    def add_model(self, model) -> None:
        self.update_model(model, added_at=datetime.utcnow().timestamp())

    def move_model(self, new_model, old_model) -> None:
        new_key = self.build_key(new_model)
        if not new_key:
            return

        old_key = self.build_key(old_model)
        if not old_key:
            return

        mapping = self.get(self.cache_key)
        if mapping is None:
            mapping = {}

        model_dict = mapping.get(old_key, {})
        mapping[new_key] = model_dict
        mapping.pop(old_key, None)

        self.set(self.cache_key, mapping)

    def remove_model(self, model) -> None:
        key = self.build_key(model)
        if not key:
            return

        mapping = self.get(self.cache_key)
        if mapping:
            mapping.pop(key, None)
        elif mapping is None:
            mapping = {}

        self.set(self.cache_key, mapping)

    async def initialize_cache_for_models(self, pipelines: List[Dict] = None) -> None:
        if pipelines is None:
            from mage_ai.data_preparation.models.pipeline import Pipeline

            pipeline_uuids_and_repo_path = Pipeline.get_all_pipelines_all_projects(
                self.repo_path,
                include_repo_path=True,
            )

            pipeline_dicts = await asyncio.gather(
                *[Pipeline.load_metadata(
                    uuid,
                    raise_exception=False,
                    repo_path=repo_path,
                ) for uuid, repo_path in pipeline_uuids_and_repo_path],
            )
            pipelines = [p for p in pipeline_dicts if p is not None]

        mapping = {}
        for pipeline_dict in pipelines:
            repo_path = pipeline_dict.get('repo_path')

            key = self.build_key(pipeline_dict, repo_path=repo_path)

            if not key:
                continue
            if key not in mapping:
                mapping[key] = {}

            mapping[key] = build_pipeline_dict(
                pipeline_dict,
                include_details=True,
                repo_path=remove_base_repo_path_or_name(repo_path) if repo_path else repo_path,
            )

        self.set(self.cache_key, mapping)
