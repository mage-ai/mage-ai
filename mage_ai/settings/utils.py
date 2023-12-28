import os

from mage_ai.settings.constants import REPO_PATH_ENV_VAR


def base_repo_path() -> str:
    return os.getenv(REPO_PATH_ENV_VAR) or os.getcwd()


def base_repo_dirname() -> str:
    return os.path.dirname(base_repo_path())


def base_repo_name() -> str:
    return os.path.basename(base_repo_path())
