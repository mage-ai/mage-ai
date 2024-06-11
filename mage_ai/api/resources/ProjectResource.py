import os
import subprocess
import uuid

import aiohttp
import yaml

from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.cache.file import FileCache
from mage_ai.cache.ttl import async_ttl_cache
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.repo_manager import (
    ProjectType,
    get_repo_config,
    init_repo,
)
from mage_ai.orchestration.db import safe_db_query
from mage_ai.server.constants import VERSION
from mage_ai.settings.platform import (
    activate_project,
    project_platform_activated,
    update_settings,
)
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.environments import is_debug
from mage_ai.shared.hash import combine_into, merge_dict
from mage_ai.usage_statistics.logger import UsageStatisticLogger


@async_ttl_cache(maxsize=1, ttl=600)
async def get_latest_version() -> str:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://pypi.org/pypi/mage-ai/json',
                timeout=3,
            ) as response:
                response_json = await response.json()
                latest_version = response_json.get('info', {}).get('version', None)
    except Exception:
        latest_version = VERSION

    return latest_version


async def build_project(
    repo_config=None,
    repo_path: str = None,
    root_project: bool = False,
    user=None,
    **kwargs,
):
    project = Project(
        repo_config=repo_config,
        context_data=kwargs.get('context_data'),
        root_project=root_project,
        user=user,
    )

    model = merge_dict(project.repo_config.to_dict(), dict(
        emr_config=project.emr_config,
        features=project.features,
        features_defined=project.features_defined,
        features_override=project.features_override,
        latest_version=await get_latest_version(),
        name=project.name,
        platform_settings=project.platform_settings(),
        project_uuid=project.project_uuid,
        projects=project.projects(),
        remote_variables_dir=project.remote_variables_dir,
        repo_path=project.repo_path,
        root_project=root_project,
        settings=project.settings,
        spark_config=project.spark_config,
        version=project.version,
        workspace_config_defaults=project.workspace_config_defaults,
    ))

    if kwargs:
        model.update(kwargs)

    return model


class ProjectResource(GenericResource):
    @classmethod
    @safe_db_query
    async def collection(self, query, meta, user, **kwargs):
        project = await self.member(None, user, **kwargs)

        other_projects = []
        if not project.model.get('root_project') and project_platform_activated():
            root_project = await self.member(None, user, root_project=True, **kwargs)
            if root_project and root_project.model and root_project.model.get('projects'):
                other_projects.append(root_project)

        features = {}
        if other_projects:
            for project2 in other_projects:
                combine_into(project2.features_defined or {}, features)

        combine_into(project.features_defined or {}, features)

        features2 = project.features or {}
        combine_into(features, features2)

        project.features = features2

        return self.build_result_set(
            [project] + other_projects,
            user,
            **kwargs,
        )

    @classmethod
    @safe_db_query
    async def create(self, payload, user, **kwargs):
        project_uuid = payload.get('uuid')
        project_repo_path = payload.get('repo_path')
        project_type = payload.get('type')

        directory = os.path.join(base_repo_path(), project_repo_path)
        if ProjectType.STANDALONE == project_type:
            init_repo(
                os.path.join(directory, project_uuid),
                project_type=project_type,
                project_uuid=project_uuid,
            )
        elif 'dbt' == project_type:
            proc = subprocess.run(
                [
                    'dbt',
                    'init',
                    project_uuid,
                    '-s',
                ],
                cwd=directory,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=10,
            )
            proc.check_returncode()

            with open(os.path.join(directory, project_uuid, 'profiles.yml'), 'w') as f:
                content = yaml.safe_dump({
                    project_uuid: dict(
                        outputs=dict(
                            dev=dict(
                                dbname='',
                                host='',
                                password='postgres',
                                port=5432,
                                schema='public',
                                type='postgres',
                                user='postgres',
                            ),
                        ),
                        target='dev',
                    ),
                })
                f.write(content)

        return self({}, user, **kwargs)

    @classmethod
    @safe_db_query
    async def member(self, _, user, **kwargs):
        model = await build_project(user=user, **kwargs)
        return self(model, user, **kwargs)

    @safe_db_query
    async def update(self, payload, **kwargs):
        if payload.get('activate_project'):
            activate_project(payload.get('activate_project'), user=self.current_user)

        platform_settings = payload.get('platform_settings')
        root_project = payload.get('root_project')
        repo_config = get_repo_config(root_project=True if root_project else False)

        if root_project and platform_settings:
            update_settings(settings=platform_settings)
            self.model = await build_project(repo_config, user=self.current_user)
            return self

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

        if 'deny_improve_mage' in payload:
            await UsageStatisticLogger().project_deny_improve_mage(
                repo_config.project_uuid or data.get('project_uuid'),
            )

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

        command_center_enabled = (self.model.get('features') or {}).get(FeatureUUID.COMMAND_CENTER)

        if len(data.keys()) >= 1:
            repo_config.save(**data)

        self.model = await build_project(repo_config, user=self.current_user)

        if should_log_project:
            await UsageStatisticLogger().project_impression()

        project = Project(repo_config=repo_config)
        if project.is_feature_enabled(FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE):
            await BlockActionObjectCache.initialize_cache(replace=True)

        if not command_center_enabled and \
                (self.model.get('features') or {}).get(FeatureUUID.COMMAND_CENTER):

            def __callback(*args, **kwargs):
                try:
                    FileCache.initialize_cache_with_settings(replace=True)
                except Exception as err:
                    if is_debug():
                        raise err

            self.on_update_callback = __callback

        return self
