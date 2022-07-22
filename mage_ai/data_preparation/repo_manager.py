from mage_ai.data_preparation.shared.constants import REPO_PATH_ENV_VAR
from mage_ai.data_preparation.templates.utils import copy_template_directory
import os
import sys
import yaml


class RepoConfig:
    def __init__(self):
        self.repo_path = get_repo_path()
        self.variables_dir = self.repo_path
        try:
            with open(os.path.join(self.repo_path, 'metadata.yaml')) as f:
                repo_config = yaml.full_load(f) or {}
            self.variables_dir = repo_config.get('variables_dir', self.repo_path)
            if self.variables_dir is not None and not self.variables_dir.startswith('s3'):
                self.variables_dir = os.path.abspath(
                    os.path.join(self.repo_path, self.variables_dir),
                )
        except Exception:
            pass


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


def get_repo_config() -> RepoConfig:
    return RepoConfig()


def set_repo_path(repo_path: str) -> None:
    os.environ[REPO_PATH_ENV_VAR] = repo_path
    sys.path.append(os.path.dirname(repo_path))
