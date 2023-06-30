import os
import sys

from mage_ai.shared.environments import is_test

"""
Moved from repo_manager because repo_manager has too many dependencies
which can cause circular import errors.
"""

if is_test():
    DEFAULT_MAGE_DATA_DIR = './'
else:
    DEFAULT_MAGE_DATA_DIR = '~/.mage_data'
MAGE_DATA_DIR_ENV_VAR = 'MAGE_DATA_DIR'
REPO_PATH_ENV_VAR = 'MAGE_REPO_PATH'


def get_repo_path() -> str:
    return os.getenv(REPO_PATH_ENV_VAR) or os.getcwd()


def set_repo_path(repo_path: str) -> None:
    os.environ[REPO_PATH_ENV_VAR] = repo_path
    sys.path.append(os.path.dirname(repo_path))


def get_repo_name() -> str:
    return os.path.basename(get_repo_path())


def get_data_dir() -> str:
    return os.getenv(MAGE_DATA_DIR_ENV_VAR) or DEFAULT_MAGE_DATA_DIR
