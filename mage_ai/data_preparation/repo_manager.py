from mage_ai.data_preparation.shared.constants import REPO_PATH_ENV_VAR
from mage_ai.data_preparation.templates.utils import copy_templates
import os


def init_repo(repo_path: str) -> None:
    """
    Initialize a repository under the current path.
    """
    if os.path.exists(repo_path):
        return

    copy_templates('repo', repo_path)


def get_repo_path() -> str:
    return os.getenv(REPO_PATH_ENV_VAR)


def set_repo_path(repo_path: str) -> None:
    os.environ[REPO_PATH_ENV_VAR] = repo_path
