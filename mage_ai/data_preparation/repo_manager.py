from jinja2 import Template
from mage_ai.data_preparation.shared.constants import REPO_PATH_ENV_VAR
from mage_ai.shared.environments import is_test
from mage_ai.data_preparation.templates.utils import copy_template_directory
from typing import Dict
import os
import sys
import traceback
import yaml

MAGE_DATA_DIR_ENV_VAR = 'MAGE_DATA_DIR'
if is_test():
    DEFAULT_MAGE_DATA_DIR = './'
else:
    DEFAULT_MAGE_DATA_DIR = '~/.mage_data'


class RepoConfig:
    def __init__(self, repo_path: str = None, config_dict: Dict = None):
        self.repo_path = repo_path or get_repo_path()
        self.repo_name = os.path.basename(self.repo_path)
        try:
            if not config_dict:
                metadata_path = os.path.join(self.repo_path, 'metadata.yaml')
                if os.path.exists(metadata_path):
                    with open(os.path.join(self.repo_path, 'metadata.yaml')) as f:
                        config_file = Template(f.read()).render(env_var=os.getenv)
                        repo_config = yaml.full_load(config_file) or {}
                else:
                    repo_config = dict()
            else:
                repo_config = config_dict

            # Priority:
            # 1. 'variables_dir' from config_dict
            # 1. os.getenv(MAGE_DATA_DIR_ENV_VAR)
            # 2. 'variables_dir' from repo_config file
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

            self.remote_variables_dir = repo_config.get('remote_variables_dir')
            self.ecs_config = repo_config.get('ecs_config')
            self.emr_config = repo_config.get('emr_config')
            self.gcp_cloud_run_config = repo_config.get('gcp_cloud_run_config')
            self.notification_config = repo_config.get('notification_config', dict())

            self.s3_bucket = None
            self.s3_path_prefix = None
            if self.remote_variables_dir is not None and \
                    self.remote_variables_dir.startswith('s3://'):
                path_parts = self.remote_variables_dir.replace('s3://', '').split('/')
                self.s3_bucket = path_parts.pop(0)
                self.s3_path_prefix = '/'.join(path_parts)

            self.logging_config = repo_config.get('logging_config', dict())
        except Exception:
            traceback.print_exc()
            pass

    @classmethod
    def from_dict(self, config_dict: Dict) -> 'RepoConfig':
        repo_path = config_dict.get('repo_path')
        repo_config = RepoConfig(repo_path=repo_path, config_dict=config_dict)
        return repo_config

    def to_dict(self, remote: bool = False) -> Dict:
        return dict(
            ecs_config=self.ecs_config,
            emr_config=self.emr_config,
            gcp_cloud_run_config=self.gcp_cloud_run_config,
            notification_config=self.notification_config,
            repo_path=self.repo_path,
            variables_dir=self.remote_variables_dir if remote else self.variables_dir,
            remote_variables_dir=self.remote_variables_dir,
        )


def init_repo(repo_path: str) -> None:
    """
    Initialize a repository under the current path.
    """
    if os.path.exists(repo_path):
        raise FileExistsError(f'Repository {repo_path} already exists')

    os.makedirs(os.getenv(MAGE_DATA_DIR_ENV_VAR, DEFAULT_MAGE_DATA_DIR), exist_ok=True)
    copy_template_directory('repo', repo_path)


def get_repo_path() -> str:
    return os.getenv(REPO_PATH_ENV_VAR) or os.getcwd()


def get_repo_config(repo_path=None) -> RepoConfig:
    return RepoConfig(repo_path=repo_path)


def set_repo_path(repo_path: str) -> None:
    os.environ[REPO_PATH_ENV_VAR] = repo_path
    sys.path.append(os.path.dirname(repo_path))


def get_variables_dir(repo_path: str = None) -> str:
    return get_repo_config(repo_path=repo_path).variables_dir
