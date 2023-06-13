import os
import shutil
import sys
import traceback
import uuid
from enum import Enum
from typing import Dict

import ruamel.yaml
import yaml
from jinja2 import Template

from mage_ai.data_preparation.shared.constants import (
    MAGE_DATA_DIR_ENV_VAR,
    REPO_PATH_ENV_VAR,
)
from mage_ai.data_preparation.templates.utils import copy_template_directory
from mage_ai.shared.environments import is_test

if is_test():
    DEFAULT_MAGE_DATA_DIR = './'
else:
    DEFAULT_MAGE_DATA_DIR = '~/.mage_data'


class ProjectType(str, Enum):
    MAIN = 'main'
    SUB = 'sub'
    STANDALONE = 'standalone'


class RepoConfig:
    def __init__(self, repo_path: str = None, config_dict: Dict = None):
        from mage_ai.data_preparation.shared.utils import get_template_vars
        self.repo_path = repo_path or get_repo_path()
        self.repo_name = os.path.basename(self.repo_path)
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

            # Priority:
            # 1. 'variables_dir' from config_dict
            # 1. os.getenv(MAGE_DATA_DIR_ENV_VAR)
            # 2. 'variables_dir' from project's metadata.yaml file
            # 3. DEFAULT_MAGE_DATA_DIR
            if config_dict is not None and config_dict.get('variables_dir'):
                self.variables_dir = config_dict.get('variables_dir')
            elif os.getenv(MAGE_DATA_DIR_ENV_VAR):
                self.variables_dir = os.getenv(MAGE_DATA_DIR_ENV_VAR)
            else:
                self.variables_dir = os.path.expanduser(
                    repo_config.get('variables_dir', DEFAULT_MAGE_DATA_DIR),
                )
            if self.variables_dir is not None and not self.variables_dir.startswith('s3'):
                if os.path.isabs(self.variables_dir) and self.variables_dir != self.repo_path and (
                    not config_dict or not config_dict.get('variables_dir')
                ):
                    # If the variables_dir is an absolute path, not same as repo_path, and
                    # from config file
                    self.variables_dir = os.path.join(self.variables_dir, self.repo_name)
                else:
                    self.variables_dir = os.path.abspath(
                        os.path.join(self.repo_path, self.variables_dir),
                    )
            os.makedirs(self.variables_dir, exist_ok=True)

            self.project_type = repo_config.get('project_type')
            self.cluster_type = repo_config.get('cluster_type')
            self.remote_variables_dir = repo_config.get('remote_variables_dir')

            # Executor configs
            self.azure_container_instance_config = \
                repo_config.get('azure_container_instance_config')
            self.ecs_config = repo_config.get('ecs_config')
            self.emr_config = repo_config.get('emr_config')
            self.gcp_cloud_run_config = repo_config.get('gcp_cloud_run_config')
            self.k8s_executor_config = repo_config.get('k8s_executor_config')
            self.spark_config = repo_config.get('spark_config')

            self.notification_config = repo_config.get('notification_config', dict())
            self.queue_config = repo_config.get('queue_config', dict())
            self.project_uuid = repo_config.get('project_uuid')
            self.help_improve_mage = repo_config.get('help_improve_mage')
            self.retry_config = repo_config.get('retry_config')

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
        return os.path.join(self.repo_path, 'metadata.yaml')

    def to_dict(self, remote: bool = False) -> Dict:
        return dict(
            project_type=self.project_type,
            azure_container_instance_config=self.azure_container_instance_config,
            ecs_config=self.ecs_config,
            emr_config=self.emr_config,
            gcp_cloud_run_config=self.gcp_cloud_run_config,
            notification_config=self.notification_config,
            queue_config=self.queue_config,
            repo_path=self.repo_path,
            variables_dir=self.remote_variables_dir if remote else self.variables_dir,
            variables_retention_period=self.variables_retention_period,
            remote_variables_dir=self.remote_variables_dir,
            project_uuid=self.project_uuid,
            help_improve_mage=self.help_improve_mage,
            spark_config=self.spark_config,
        )

    def save(self, **kwargs) -> None:
        yml = ruamel.yaml.YAML()
        yml.preserve_quotes = True
        yml.indent(mapping=2, sequence=2, offset=0)

        if os.path.exists(self.metadata_path):
            with open(self.metadata_path) as f:
                data = yml.load(f)
        else:
            data = {}

        for key, value in kwargs.items():
            data[key] = value
            if hasattr(self, key):
                setattr(self, key, value)

        with open(self.metadata_path, 'w') as f:
            yml.dump(data, f)


def init_repo(repo_path: str, project_type: str = ProjectType.STANDALONE) -> str:
    """
    Initialize a repository under the current path.
    """
    if os.path.exists(repo_path):
        raise FileExistsError(f'Repository {repo_path} already exists')

    new_config = dict()
    if project_type == ProjectType.MAIN:
        copy_template_directory('main', repo_path)
    elif project_type == ProjectType.SUB:
        os.makedirs(
            os.getenv(MAGE_DATA_DIR_ENV_VAR) or DEFAULT_MAGE_DATA_DIR,
            exist_ok=True,
        )
        copy_template_directory('repo', repo_path)
        current_metadata = get_repo_config().metadata_path
        new_metadata = get_repo_config(repo_path).metadata_path
        if os.path.exists(current_metadata):
            shutil.copyfile(current_metadata, new_metadata)
        new_config.update(project_type=ProjectType.SUB.value)
    else:
        os.makedirs(
            os.getenv(MAGE_DATA_DIR_ENV_VAR) or DEFAULT_MAGE_DATA_DIR,
            exist_ok=True,
        )
        copy_template_directory('repo', repo_path)

    project_uuid = uuid.uuid4().hex
    new_config.update(project_uuid=project_uuid)
    get_repo_config(repo_path).save(**new_config)
    return project_uuid


def get_data_dir() -> str:
    return os.getenv(MAGE_DATA_DIR_ENV_VAR) or DEFAULT_MAGE_DATA_DIR


def get_repo_name() -> str:
    return os.path.basename(get_repo_path())


def get_repo_path() -> str:
    return os.getenv(REPO_PATH_ENV_VAR) or os.getcwd()


def get_repo_config(repo_path=None) -> RepoConfig:
    return RepoConfig(repo_path=repo_path)


def get_project_type(repo_path=None) -> ProjectType:
    return get_repo_config(repo_path=repo_path).project_type


def set_repo_path(repo_path: str) -> None:
    os.environ[REPO_PATH_ENV_VAR] = repo_path
    sys.path.append(os.path.dirname(repo_path))


def get_variables_dir(repo_path: str = None) -> str:
    return get_repo_config(repo_path=repo_path).variables_dir


project_uuid = get_repo_config().project_uuid


def get_project_uuid() -> str:
    return project_uuid
