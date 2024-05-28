import json
import logging
import os
import traceback
import uuid
from enum import Enum
from typing import Dict, Optional
from warnings import warn

import ruamel.yaml
from jinja2 import Template

from mage_ai.cluster_manager.constants import ClusterType
from mage_ai.data_preparation.templates.utils import copy_template_directory
from mage_ai.settings import INITIAL_METADATA, settings
from mage_ai.settings.repo import (
    DEFAULT_MAGE_DATA_DIR,
    MAGE_DATA_DIR_ENV_VAR,
    PROJECT_METADATA_FILENAME,
)
from mage_ai.settings.repo import get_data_dir as get_data_dir_new
from mage_ai.settings.repo import get_metadata_path
from mage_ai.settings.repo import get_repo_name as get_repo_name_new
from mage_ai.settings.repo import get_repo_path as get_repo_path_new
from mage_ai.settings.repo import get_variables_dir
from mage_ai.settings.repo import set_repo_path as set_repo_path_new
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.environments import is_debug
from mage_ai.shared.yaml import load_yaml, trim_strings

yml = ruamel.yaml.YAML()
yml.preserve_quotes = True
yml.width = float('inf')
yml.indent(mapping=2, sequence=2, offset=0)

logger = logging.getLogger(__name__)


class ProjectType(str, Enum):
    MAIN = 'main'
    SUB = 'sub'
    STANDALONE = 'standalone'


class RepoConfig:
    def __init__(
        self,
        repo_path: str = None,
        config_dict: Dict = None,
        context_data: Dict = None,
        root_project: bool = False,
        user=None,
    ):
        self.root_project = root_project
        self.repo_path = repo_path or get_repo_path_new(
            context_data=context_data,
            root_project=self.root_project,
            user=user,
        )
        self.repo_name = os.path.basename(self.repo_path)
        self.project_uuid = None
        self.project_type = None
        self.cluster_type = None

        self.remote_variables_dir = None
        self.ai_config = None
        self.azure_container_instance_config = None
        self.ecs_config = None
        self.emr_config = None
        self.features = None
        self.gcp_cloud_run_config = None
        self.k8s_executor_config = None
        self.spark_config = None
        self.notification_config = None
        self.queue_config = None
        self.help_improve_mage = None
        self.openai_api_key = None
        self._pipelines = None
        self.retry_config = None
        self.ldap_config = None
        self.s3_bucket = None
        self.s3_path_prefix = None
        self.settings_backend = None
        self.logging_config = None
        self.variables_dir = None
        self.variables_retention_period = None
        self.workspace_initial_metadata = None
        self.workspace_shared_config = None

        from mage_ai.data_preparation.shared.utils import get_template_vars

        try:
            if not config_dict:
                if os.path.exists(self.metadata_path):
                    with open(self.metadata_path) as f:
                        config_file = Template(f.read()).render(**get_template_vars())
                        repo_config = load_yaml(config_file) or {}
                        repo_config = trim_strings(repo_config)
                else:
                    repo_config = dict()
            else:
                repo_config = config_dict

            # config_dict is passed into the RepoConfig in certain cases where the metadata
            # may not be able to be read. In these cases, we will try to get the variables_dir
            # from the config_dict. Otherwise, we will set the variables_dir with
            # `get_variables_dir`.
            if config_dict and config_dict.get('variables_dir'):
                self.variables_dir = config_dict.get('variables_dir')
                if not self.variables_dir.startswith('s3'):
                    self.variables_dir = os.path.abspath(
                        os.path.join(self.repo_path, self.variables_dir)
                    )
            else:
                self.variables_dir = get_variables_dir(
                    repo_path=self.repo_path,
                    repo_config=repo_config,
                    root_project=self.root_project,
                )
            try:
                os.makedirs(self.variables_dir, exist_ok=True)
            except Exception:
                pass

            self.project_type = repo_config.get('project_type')
            self.cluster_type = repo_config.get('cluster_type')
            self.remote_variables_dir = repo_config.get('remote_variables_dir')

            # Executor configs
            self.ai_config = repo_config.get('ai_config', dict())
            self.azure_container_instance_config = repo_config.get(
                'azure_container_instance_config'
            )
            self.ecs_config = repo_config.get('ecs_config')
            self.emr_config = repo_config.get('emr_config') or dict()
            self.features = repo_config.get('features', {})
            self.gcp_cloud_run_config = repo_config.get('gcp_cloud_run_config')
            self.k8s_executor_config = repo_config.get('k8s_executor_config')
            self.spark_config = repo_config.get('spark_config')
            self.notification_config = repo_config.get('notification_config', dict())
            self.queue_config = repo_config.get('queue_config', dict())
            self.project_uuid = repo_config.get('project_uuid')
            self.help_improve_mage = repo_config.get('help_improve_mage')
            self.openai_api_key = repo_config.get('openai_api_key')
            self.pipelines = repo_config.get('pipelines')
            self.retry_config = repo_config.get('retry_config')
            self.workspace_config_defaults = repo_config.get(
                'workspace_config_defaults'
            )
            self.workspace_initial_metadata = repo_config.get(
                'workspace_initial_metadata'
            )

            self.ldap_config = repo_config.get('ldap_config')

            self.s3_bucket = None
            self.s3_path_prefix = None
            if (
                self.remote_variables_dir is not None
                and self.remote_variables_dir.startswith('s3://')
            ):
                path_parts = self.remote_variables_dir.replace('s3://', '').split('/')
                self.s3_bucket = path_parts.pop(0)
                self.s3_path_prefix = '/'.join(path_parts)

            self.settings_backend = repo_config.get('settings_backend', dict())

            self.logging_config = repo_config.get('logging_config', dict())

            self.variables_retention_period = repo_config.get(
                'variables_retention_period'
            )
        except Exception as err:
            traceback.print_exc()
            if is_debug():
                raise err

    @classmethod
    def from_dict(self, config_dict: Dict, root_project: bool = False) -> 'RepoConfig':
        repo_path = config_dict.get('repo_path')
        repo_config = RepoConfig(
            repo_path=repo_path,
            config_dict=config_dict,
            root_project=root_project,
        )
        return repo_config

    @property
    def metadata_path(self) -> str:
        if self.repo_path:
            return os.path.join(self.repo_path, 'metadata.yaml')
        else:
            return get_metadata_path(root_project=self.root_project)

    @property
    def pipelines(self):
        if isinstance(self._pipelines, dict):
            self.pipelines = self._pipelines

        return self._pipelines

    @pipelines.setter
    def pipelines(self, pipelines: Dict = None) -> None:
        from mage_ai.data_preparation.models.project.models import ProjectPipelines

        if isinstance(pipelines, dict):
            self._pipelines = ProjectPipelines.load(**(pipelines or {}))
        else:
            self._pipelines = pipelines

    def to_dict(self, remote: bool = False) -> Dict:
        return dict(
            ai_config=self.ai_config,
            azure_container_instance_config=self.azure_container_instance_config,
            ecs_config=self.ecs_config,
            emr_config=self.emr_config,
            features=self.features,
            gcp_cloud_run_config=self.gcp_cloud_run_config,
            help_improve_mage=self.help_improve_mage,
            notification_config=self.notification_config,
            openai_api_key=self.openai_api_key,
            pipelines=self.pipelines.to_dict() if self.pipelines else self.pipelines,
            project_type=self.project_type,
            project_uuid=self.project_uuid,
            queue_config=self.queue_config,
            remote_variables_dir=self.remote_variables_dir,
            repo_path=self.repo_path,
            spark_config=self.spark_config,
            variables_dir=self.remote_variables_dir if remote else self.variables_dir,
            variables_retention_period=self.variables_retention_period,
            workspace_config_defaults=self.workspace_config_defaults,
        )

    def save(self, **kwargs) -> None:
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path) as f:
                data = yml.load(f) or {}
        else:
            data = {}

        for key, value in kwargs.items():
            data[key] = value

            if 'pipelines' == key:
                self.pipelines = value
            elif hasattr(self, key):
                setattr(self, key, value)

        with open(self.metadata_path, 'w') as f:
            yml.dump(data, f)


def init_repo(
    repo_path: str,
    project_type: str = ProjectType.STANDALONE,
    cluster_type: str = None,
    project_uuid: str = None,
    root_project: bool = False,
) -> None:
    """
    Initialize a repository under the current path.
    """
    if os.path.exists(repo_path):
        raise FileExistsError(f'Repository {repo_path} already exists')

    new_config = dict()
    if INITIAL_METADATA:
        try:
            new_config = json.loads(INITIAL_METADATA)
        except Exception:
            logger.exception('Error loading initial metadata.')
    if project_type == ProjectType.MAIN:
        copy_template_directory('main', repo_path)
        new_config.update(
            cluster_type=cluster_type,
        )
    elif project_type == ProjectType.SUB:
        os.makedirs(
            os.getenv(MAGE_DATA_DIR_ENV_VAR) or DEFAULT_MAGE_DATA_DIR,
            exist_ok=True,
        )
        copy_template_directory('repo', repo_path)
        new_config.update(
            project_type=ProjectType.SUB.value,
            cluster_type=cluster_type,
            project_uuid=project_uuid,
        )
    else:
        os.makedirs(
            os.getenv(MAGE_DATA_DIR_ENV_VAR) or DEFAULT_MAGE_DATA_DIR,
            exist_ok=True,
        )
        copy_template_directory('repo', repo_path)

    if not project_uuid:
        project_uuid = uuid.uuid4().hex
    new_config.update(project_uuid=project_uuid)
    get_repo_config(repo_path, root_project=root_project).save(**new_config)


def get_repo_config(
    repo_path: str = None,
    context_data: Dict = None,
    root_project: bool = False,
    user=None,
) -> RepoConfig:
    return RepoConfig(
        repo_path=repo_path,
        context_data=context_data,
        root_project=root_project,
        user=user,
    )


def get_project_type(repo_config: RepoConfig = None, repo_path: str = None) -> ProjectType:
    from mage_ai.settings.repo import MAGE_PROJECT_TYPE_ENV_VAR

    try:
        project_type_from_env = os.getenv(MAGE_PROJECT_TYPE_ENV_VAR)
        if project_type_from_env:
            return ProjectType(project_type_from_env)
        else:
            if repo_config is None:
                repo_config = get_repo_config(repo_path=repo_path)
            return repo_config.project_type
    except Exception:
        # default to standalone project type
        return ProjectType.STANDALONE


def get_cluster_type(repo_path=None) -> Optional[ClusterType]:
    from mage_ai.settings.repo import MAGE_CLUSTER_TYPE_ENV_VAR

    try:
        cluster_type_from_env = os.getenv(MAGE_CLUSTER_TYPE_ENV_VAR)
        if cluster_type_from_env:
            return ClusterType(cluster_type_from_env)
        else:
            return get_repo_config(repo_path=repo_path).cluster_type
    except Exception:
        # default to None
        return None


def set_project_uuid_from_metadata() -> None:
    global project_uuid
    metadata_path = os.path.join(base_repo_path(), PROJECT_METADATA_FILENAME)
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r', encoding='utf-8') as f:
            config = yml.load(f) or {}
            project_uuid = config.get('project_uuid')


def update_settings_on_metadata_change() -> None:
    repo_config = get_repo_config(root_project=True)
    settings.set_settings_backend(**repo_config.settings_backend)


def init_project_uuid(overwrite_uuid: str = None, root_project: bool = False) -> None:
    """
    Initialize the project_uuid constant. The project_uuid constant is used throughout
    the server as an identifier for the project.

    Args:
        overwrite_uuid (str): If not null, the overwrite_uuid will overwrite the current
            value of project_uuid.
    """
    global project_uuid
    repo_config = get_repo_config(root_project=root_project)
    if overwrite_uuid:
        if repo_config.project_uuid != overwrite_uuid:
            repo_config.save(project_uuid=overwrite_uuid)
        project_uuid = overwrite_uuid
        return

    if not project_uuid:
        if repo_config.project_uuid:
            project_uuid = repo_config.project_uuid
        else:
            puuid = uuid.uuid4().hex
            repo_config.save(project_uuid=puuid)
            project_uuid = puuid


project_uuid = None
set_project_uuid_from_metadata()


def get_project_uuid() -> str:
    return project_uuid


# These should not be used. Please use the corresponding functions in
# mage_ai/settings/__init__.py

REPO_PATH_ENV_VAR = 'MAGE_REPO_PATH'


def get_repo_path() -> str:
    warn(
        'repo_manager.get_repo_path is deprecated. Please use mage_ai.settings.repo.get_repo_path',
        DeprecationWarning,
        stacklevel=2,
    )
    return get_repo_path_new()


def set_repo_path(repo_path: str) -> None:
    warn(
        'repo_manager.set_repo_path is deprecated. Please use mage_ai.settings.repo.set_repo_path',
        DeprecationWarning,
        stacklevel=2,
    )
    set_repo_path_new(repo_path)


def get_repo_name() -> str:
    warn(
        'repo_manager.get_repo_name is deprecated. Please use mage_ai.settings.repo.get_repo_name',
        DeprecationWarning,
        stacklevel=2,
    )
    return get_repo_name_new()


def get_data_dir() -> str:
    warn(
        'repo_manager.get_data_dir is deprecated. Please use mage_ai.settings.repo.get_data_dir',
        DeprecationWarning,
        stacklevel=2,
    )
    return get_data_dir_new()
