import os
import traceback
import uuid
from enum import Enum
from typing import Dict, Optional
from warnings import warn

import ruamel.yaml
import yaml
from jinja2 import Template

from mage_ai.cluster_manager.constants import ClusterType
from mage_ai.data_preparation.templates.utils import copy_template_directory
from mage_ai.settings.repo import DEFAULT_MAGE_DATA_DIR, MAGE_DATA_DIR_ENV_VAR
from mage_ai.settings.repo import get_data_dir as get_data_dir_new
from mage_ai.settings.repo import get_repo_name as get_repo_name_new
from mage_ai.settings.repo import get_repo_path as get_repo_path_new
from mage_ai.settings.repo import set_repo_path as set_repo_path_new

yml = ruamel.yaml.YAML()
yml.preserve_quotes = True
yml.indent(mapping=2, sequence=2, offset=0)


class ProjectType(str, Enum):
    MAIN = 'main'
    SUB = 'sub'
    STANDALONE = 'standalone'


def get_metadata_path():
    return os.path.join(get_repo_path_new(), 'metadata.yaml')


class RepoConfig:
    def __init__(
        self,
        repo_path: str = None,
        config_dict: Dict = None,
    ):
        self.repo_path = repo_path or get_repo_path_new()
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
        self.logging_config = None
        self.variables_retention_period = None

        from mage_ai.data_preparation.shared.utils import get_template_vars
        try:
            if not config_dict:
                if os.path.exists(self.metadata_path):
                    with open(self.metadata_path) as f:
                        config_file = Template(f.read()).render(
                            **get_template_vars()
                        )
                        repo_config = yaml.full_load(config_file) or {}
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
                    repo_config=repo_config
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
            self.azure_container_instance_config = \
                repo_config.get('azure_container_instance_config')
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

            self.ldap_config = repo_config.get('ldap_config')

            self.s3_bucket = None
            self.s3_path_prefix = None
            if self.remote_variables_dir is not None and \
                    self.remote_variables_dir.startswith('s3://'):
                path_parts = self.remote_variables_dir.replace('s3://', '').split('/')
                self.s3_bucket = path_parts.pop(0)
                self.s3_path_prefix = '/'.join(path_parts)

            self.logging_config = repo_config.get('logging_config', dict())

            self.variables_retention_period = repo_config.get('variables_retention_period')
        except Exception:
            traceback.print_exc()
            pass

    @classmethod
    def from_dict(self, config_dict: Dict) -> 'RepoConfig':
        repo_path = config_dict.get('repo_path')
        repo_config = RepoConfig(repo_path=repo_path, config_dict=config_dict)
        return repo_config

    @property
    def metadata_path(self) -> str:
        if self.repo_path:
            return os.path.join(self.repo_path, 'metadata.yaml')
        else:
            return get_metadata_path()

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
) -> None:
    """
    Initialize a repository under the current path.
    """
    if os.path.exists(repo_path):
        raise FileExistsError(f'Repository {repo_path} already exists')

    new_config = dict()
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
    get_repo_config(repo_path).save(**new_config)


def get_repo_config(repo_path=None) -> RepoConfig:
    return RepoConfig(repo_path=repo_path)


def get_project_type(repo_path=None) -> ProjectType:
    from mage_ai.settings.repo import MAGE_PROJECT_TYPE_ENV_VAR
    try:
        project_type_from_env = os.getenv(MAGE_PROJECT_TYPE_ENV_VAR)
        if project_type_from_env:
            return ProjectType(project_type_from_env)
        else:
            return get_repo_config(repo_path=repo_path).project_type
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


def get_variables_dir(
    repo_path: str = None,
    repo_config: Dict = None,
) -> str:
    """
    Fetches the variables directory for the project.

    Priority:
        1. os.getenv(MAGE_DATA_DIR_ENV_VAR)
        2. 'variables_dir' from repo_config argument
        3. 'variables_dir' from project's metadata.yaml file
            This method will either read from the metadata.yaml file or the repo_config argument.
            It will not read from both.
        4. DEFAULT_MAGE_DATA_DIR

    Args:
        repo_path (str): Path to the project's root directory
        repo_config (Dict): Dictionary containing the project's metadata.yaml file

    Returns:
        str: Path to the variables directory
    """
    if repo_path is None:
        repo_path = get_repo_path_new()
    repo_name = os.path.basename(repo_path)
    variables_dir = None
    if os.getenv(MAGE_DATA_DIR_ENV_VAR):
        variables_dir = os.getenv(MAGE_DATA_DIR_ENV_VAR)
    else:
        if repo_config is not None:
            variables_dir = repo_config.get('variables_dir')
        else:
            from mage_ai.data_preparation.shared.utils import get_template_vars_no_db
            if os.path.exists(get_metadata_path()):
                with open(get_metadata_path(), 'r', encoding='utf-8') as f:
                    config_file = Template(f.read()).render(
                        **get_template_vars_no_db()
                    )
                    repo_config = yaml.full_load(config_file) or {}
                    if repo_config.get('variables_dir'):
                        variables_dir = repo_config.get('variables_dir')
        if variables_dir is None:
            variables_dir = DEFAULT_MAGE_DATA_DIR
        variables_dir = os.path.expanduser(variables_dir)

    if not variables_dir.startswith('s3') and not variables_dir.startswith('gs'):
        if os.path.isabs(variables_dir) and variables_dir != repo_path:
            # If the variables_dir is an absolute path and not same as repo_path
            variables_dir = os.path.join(variables_dir, repo_name)
        else:
            variables_dir = os.path.abspath(
                os.path.join(repo_path, variables_dir),
            )
        try:
            os.makedirs(variables_dir, exist_ok=True)
        except Exception:
            pass
    return variables_dir


def set_project_uuid_from_metadata() -> None:
    global project_uuid
    if os.path.exists(get_metadata_path()):
        with open(get_metadata_path(), 'r', encoding='utf-8') as f:
            config = yml.load(f) or {}
            project_uuid = config.get('project_uuid')


def init_project_uuid(overwrite_uuid: str = None) -> None:
    """
    Initialize the project_uuid constant. The project_uuid constant is used throughout
    the server as an identifier for the project.

    Args:
        overwrite_uuid (str): If not null, the overwrite_uuid will overwrite the current
            value of project_uuid.
    """
    global project_uuid
    repo_config = get_repo_config()
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
        stacklevel=2
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
