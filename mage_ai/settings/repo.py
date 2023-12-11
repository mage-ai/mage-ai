import os
import sys
from pathlib import Path
from typing import Dict

import yaml
from jinja2 import Template

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
REPO_PATH_ENV_VAR = 'MAGE_REPO_PATH'


def get_repo_path(file_path: str = None, root_project: bool = False) -> str:
    repo_path = os.getenv(REPO_PATH_ENV_VAR) or os.getcwd()
    if root_project:
        return repo_path

    from mage_ai.settings.platform import (
        build_active_project_repo_path,
        build_repo_path_for_all_projects,
        has_settings,
    )

    if has_settings():
        repo_path_use = None

        if file_path:
            for project_name, settings in build_repo_path_for_all_projects(
                repo_path=repo_path,
            ).items():
                full_path = settings['full_path']
                path = settings['path']

                try:
                    if file_path.startswith(full_path) or Path(file_path).relative_to(path):
                        repo_path_use = full_path
                        break
                except ValueError:
                    pass

        if repo_path_use:
            return repo_path_use

        return build_active_project_repo_path(repo_path)

    return repo_path


def set_repo_path(repo_path: str) -> None:
    os.environ[REPO_PATH_ENV_VAR] = repo_path
    sys.path.append(os.path.dirname(repo_path))


def get_repo_name(root_project: bool = False) -> str:
    from mage_ai.settings.platform import has_settings

    repo_path = get_repo_path(root_project=root_project)

    if has_settings():
        return Path(repo_path).relative_to(get_repo_path(root_project=True))

    return os.path.basename(repo_path)


def get_data_dir() -> str:
    return os.getenv(MAGE_DATA_DIR_ENV_VAR) or DEFAULT_MAGE_DATA_DIR


def get_metadata_path(root_project: bool = False):
    return os.path.join(get_repo_path(root_project=root_project), 'metadata.yaml')


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
    repo_name = get_repo_name(root_project=root_project)
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
