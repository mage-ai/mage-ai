from mage_ai.data_preparation.shared.constants import REPO_PATH_ENV_VAR
from mage_ai.data_preparation.templates.utils import copy_template_directory
from typing import Dict
import os
import sys
import yaml


class RepoConfig:
    def __init__(self, repo_path: str = None):
        self.repo_path = repo_path or get_repo_path()
        self.variables_dir = self.repo_path
        try:
            with open(os.path.join(self.repo_path, 'metadata.yaml')) as f:
                repo_config = yaml.full_load(f) or {}
            self.variables_dir = repo_config.get('variables_dir', self.repo_path)
            if self.variables_dir is not None and not self.variables_dir.startswith('s3'):
                self.variables_dir = os.path.abspath(
                    os.path.join(self.repo_path, self.variables_dir),
                )
            self.remote_variables_dir = repo_config.get('remote_variables_dir')
            self.emr_config = repo_config.get('emr_config')
        except Exception:
            pass

    @classmethod
    def from_dict(self, config_dict: Dict) -> 'RepoConfig':
        repo_config = RepoConfig()
        repo_config.emr_config = config_dict.get('emr_config')
        repo_config.repo_path = config_dict.get('repo_path')
        repo_config.variables_dir = config_dict.get('variables_dir')
        repo_config.remote_variables_dir = config_dict.get('remote_variables_dir')
        return repo_config

    def to_dict(self, remote: bool = False) -> Dict:
        return dict(
            emr_config=self.emr_config,
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

    from mage_ai.data_preparation.models.pipeline import Pipeline
    Pipeline.create('default_pipeline', repo_path)


def get_repo_path() -> str:
    return os.getenv(REPO_PATH_ENV_VAR) or os.getcwd()


def get_repo_config(repo_path=None) -> RepoConfig:
    return RepoConfig(repo_path=repo_path)


def set_repo_path(repo_path: str) -> None:
    os.environ[REPO_PATH_ENV_VAR] = repo_path
    sys.path.append(os.path.dirname(repo_path))
