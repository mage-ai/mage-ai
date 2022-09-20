from mage_ai.data_preparation.shared.constants import REPO_PATH_ENV_VAR
from mage_ai.data_preparation.templates.utils import copy_template_directory
from jinja2 import Template
from typing import Dict
import os
import sys
import traceback
import yaml


class RepoConfig:
    def __init__(self, repo_path: str = None, config_dict: Dict = None):
        self.repo_path = repo_path or get_repo_path()
        self.repo_name = os.path.basename(self.repo_path)
        self.variables_dir = self.repo_path
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

            self.variables_dir = repo_config.get('variables_dir', self.repo_path)
            if self.variables_dir is not None and not self.variables_dir.startswith('s3'):
                self.variables_dir = os.path.abspath(
                    os.path.join(self.repo_path, self.variables_dir),
                )
            self.remote_variables_dir = repo_config.get('remote_variables_dir')
            self.ecs_config = repo_config.get('ecs_config')
            self.emr_config = repo_config.get('emr_config')
            self.notification_config = repo_config.get('notification_config', dict())

            self.s3_bucket = None
            self.s3_path_prefix = None
            if self.remote_variables_dir is not None and \
                    self.remote_variables_dir.startswith('s3://'):
                path_parts = self.remote_variables_dir.replace('s3://', '').split('/')
                self.s3_bucket = path_parts.pop(0)
                self.s3_path_prefix = '/'.join(path_parts)
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
        return

    copy_template_directory('repo', repo_path)


def get_repo_path() -> str:
    return os.getenv(REPO_PATH_ENV_VAR) or os.getcwd()


def get_repo_config(repo_path=None) -> RepoConfig:
    return RepoConfig(repo_path=repo_path)


def set_repo_path(repo_path: str) -> None:
    os.environ[REPO_PATH_ENV_VAR] = repo_path
    sys.path.append(os.path.dirname(repo_path))
