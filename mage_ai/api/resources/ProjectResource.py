import uuid

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.orchestration.db import safe_db_query
from mage_ai.shared.hash import merge_dict
from mage_ai.usage_statistics.logger import UsageStatisticLogger


async def build_project(repo_config=None, **kwargs):
    project = Project(repo_config=repo_config)

    model = merge_dict(project.repo_config.to_dict(), dict(
        emr_config=project.emr_config,
        features=project.features,
        latest_version=await project.latest_version(),
        name=project.name,
        project_uuid=project.project_uuid,
        remote_variables_dir=project.remote_variables_dir,
        spark_config=project.spark_config,
        version=project.version,
    ))

    if kwargs:
        model.update(kwargs)

    return model


class ProjectResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        project = await self.member(None, user, **kwargs)
        collection = [project.model]

        return self.build_result_set(
            collection,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    async def member(self, _, user, **kwargs):
        model = await build_project()
        return self(model, user, **kwargs)

    @safe_db_query
    async def update(self, payload, **kwargs):
        repo_config = get_repo_config()

        data = {}
        should_log_project = self.model.get('help_improve_mage') or False

        if 'features' in payload:
            for k, v in payload.get('features', {}).items():
                if v is not None:
                    if 'features' not in data:
                        data['features'] = {}
                    data['features'][k] = v
            features = data.get('features')
            if features is not None:
                data['features'] = merge_dict(
                    repo_config.features or {},
                    features,
                )

        if 'help_improve_mage' in payload:
            if payload['help_improve_mage']:
                should_log_project = True

                if not repo_config.project_uuid:
                    data['project_uuid'] = uuid.uuid4().hex

            data['help_improve_mage'] = payload['help_improve_mage']

        if 'openai_api_key' in payload:
            openai_api_key = payload.get('openai_api_key')
            if repo_config.openai_api_key != openai_api_key:
                data['openai_api_key'] = payload.get('openai_api_key')

        if 'emr_config' in payload:
            data['emr_config'] = payload['emr_config']

        if 'pipelines' in payload:
            data['pipelines'] = payload['pipelines']

        if 'spark_config' in payload:
            data['spark_config'] = payload['spark_config']

        if 'remote_variables_dir' in payload:
            data['remote_variables_dir'] = payload['remote_variables_dir']

        if len(data.keys()) >= 1:
            repo_config.save(**data)

        self.model = await build_project(repo_config)

        if should_log_project:
            await UsageStatisticLogger().project_impression()

        project = Project(repo_config=repo_config)
        if project.is_feature_enabled(FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE):
            await BlockActionObjectCache.initialize_cache(replace=True)

        return self
