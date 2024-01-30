import os
import sys
from pathlib import Path
from typing import Dict

import yaml
from jinja2 import Template

from mage_ai.settings.constants import PROJECT_METADATA_FILENAME, REPO_PATH_ENV_VAR
from mage_ai.settings.platform.constants import set_project_platform_activated_flag
from mage_ai.settings.platform.utils import project_platform_activated
from mage_ai.settings.utils import base_repo_dirname, base_repo_path
from mage_ai.shared.environments import is_test

MAGE_PROJECT_TYPE_ENV_VAR = 'PROJECT_TYPE'
MAGE_CLUSTER_TYPE_ENV_VAR = 'CLUSTER_TYPE'

"""
Moved from repo_manager because repo_manager has too many dependencies
which can cause circular import errors.
"""

if is_test():
    DEFAULT_MAGE_DATA_DIR = '.'
else:
    DEFAULT_MAGE_DATA_DIR = os.path.join('~', '.mage_data')
MAGE_DATA_DIR_ENV_VAR = 'MAGE_DATA_DIR'


def base_repo_path_directory_name() -> str:
    return os.path.dirname(base_repo_path())


def get_repo_path(
    file_path: str = None,
    root_project: bool = False,
    absolute_path: bool = True,
) -> str:
    """
    Retrieve the repository path based on the given parameters.

    Args:
        file_path (str, optional): The path of a file within the repository.
        root_project (bool, optional): If True, returns the root project's repository path.
        absolute_path (bool, optional): If True, returns the absolute repository path;
            if False, returns the path relative to the base repository directory.

    Returns:
        str: The repository path as per the specified parameters.

    Note:
        This function provides flexibility in obtaining the repository path based on different
        scenarios. If a specific file path is provided, it attempts to determine the repository
        path for that file. If `root_project` is True, it returns the root project's repository
        path. The `absolute_path` parameter controls whether the returned path is absolute or
        relative to the base repository directory.

        If the active project is detected and not in root mode, the active project's repository
        path is used; otherwise, the base repository path is returned.

        If an absolute path is requested, the full repository path is returned. If a relative
        path is requested, an attempt is made to compute the path relative to the base repository
        directory.

    Examples:
        >>> get_repo_path('/path/to/file.txt')
        '/path/to/repo'

        >>> get_repo_path(root_project=True)
        '/path/to/root/project/repo'

        >>> get_repo_path(absolute_path=False)
        'relative/path/to/repo'
    """
    repo_path = base_repo_path()
    repo_path_use = None

    if not root_project:
        if project_platform_activated():
            from mage_ai.settings.platform import (
                build_active_project_repo_path,
                get_repo_paths_for_file_path,
            )

            if file_path:
                settings = get_repo_paths_for_file_path(file_path, repo_path)
                if settings and settings.get('full_path'):
                    repo_path_use = settings.get('full_path')

            if not repo_path_use:
                repo_path_use = build_active_project_repo_path(repo_path)

    if repo_path_use:
        repo_path = repo_path_use

    if absolute_path:
        return repo_path

    try:
        return str(Path(repo_path).relative_to(base_repo_path_directory_name()))
    except ValueError:
        return None


def set_repo_path(repo_path: str) -> None:
    os.environ[REPO_PATH_ENV_VAR] = repo_path
    sys.path.append(os.path.dirname(repo_path))
    set_project_platform_activated_flag()


def get_repo_name(repo_path: str = None, root_project: bool = False) -> str:
    # If root_project is False:
    # get_repo_path() == /home/src/test/nested_repo_project
    # If root_project is True:
    # get_repo_path() == /home/src/test
    repo_path = repo_path or get_repo_path(root_project=root_project)

    if project_platform_activated():
        # If root_project is False:
        # get_repo_path() == /home/src/test/nested_repo_project
        # If root_project is True:
        # get_repo_path() == /home/src/test

        # base_repo_dirname() == /home/src

        # If root_project is False:
        # /home/src/test/nested_repo_project relative_to /home/src == test/nested_repo_project
        # The case above will make the variables directory turn out to be:
        # /home/src/test/test/nested_repo_project (it adds the root_project twice).

        # If root_project is True:
        # /home/src/test relative_to /home/src == test

        return Path(repo_path).relative_to(
            base_repo_dirname() if root_project else base_repo_path(),
        )

    return os.path.basename(repo_path)


def get_data_dir() -> str:
    return os.getenv(MAGE_DATA_DIR_ENV_VAR) or DEFAULT_MAGE_DATA_DIR


def get_metadata_path(root_project: bool = False):
    return os.path.join(get_repo_path(root_project=root_project), PROJECT_METADATA_FILENAME)


def get_variables_dir(
    repo_path: str = None,
    repo_config: Dict = None,
    root_project: bool = False,
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
        repo_path = get_repo_path(root_project=root_project)
    repo_name = get_repo_name(repo_path=repo_path, root_project=root_project)
    variables_dir = None
    if os.getenv(MAGE_DATA_DIR_ENV_VAR):
        variables_dir = os.getenv(MAGE_DATA_DIR_ENV_VAR)
    else:
        if repo_config is not None:
            variables_dir = repo_config.get('variables_dir')
        else:
            from mage_ai.data_preparation.shared.utils import get_template_vars_no_db

            metadata_path = get_metadata_path(root_project=root_project)
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    config_file_raw = f.read()
                    repo_config = yaml.full_load(config_file_raw) or {}
                    if repo_config.get('variables_dir'):
                        variables_dir = repo_config.get('variables_dir')
                        variables_dir = Template(variables_dir).render(
                            **get_template_vars_no_db()
                        )
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
