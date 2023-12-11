import os
import sys
from typing import Dict

import yaml
from jinja2 import Template

from mage_ai.shared.environments import is_test
from mage_ai.shared.io import safe_write

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
LOCAL_PROJECT_METADATA_FILENAME = '.metadata.yaml'


def set_local_project_metadata(repo_path: str = None, project_metadata: Dict = None) -> Dict:
    variables_dir = get_variables_dir(repo_path=repo_path, root_project=True)
    local_project_metadata_path = os.path.join(variables_dir, LOCAL_PROJECT_METADATA_FILENAME)

    content = yaml.dump(project_metadata)
    safe_write(local_project_metadata_path, content)


def get_set_local_project_metadata(repo_path: str = None, project_metadata: Dict = None) -> Dict:
    project_metadata_init = {}

    variables_dir = get_variables_dir(repo_path=repo_path, root_project=True)
    local_project_metadata_path = os.path.join(variables_dir, LOCAL_PROJECT_METADATA_FILENAME)

    if os.path.exists(local_project_metadata_path):
        from mage_ai.data_preparation.shared.utils import get_template_vars_no_db

        with open(local_project_metadata_path, 'r', encoding='utf-8') as f:
            config_file = Template(f.read()).render(
                **get_template_vars_no_db()
            )
            project_metadata_init = yaml.full_load(config_file) or {}

    if project_metadata:
        project_metadata_init.update(project_metadata)
        set_local_project_metadata(repo_path=repo_path, project_metadata=project_metadata_init)

    return project_metadata_init


def get_repo_path(root_project: bool = False) -> str:
    repo_path = os.getenv(REPO_PATH_ENV_VAR) or os.getcwd()
    if root_project:
        return repo_path

    project_paths = get_project_paths()
    if project_paths:
        project_metadata = get_set_local_project_metadata(repo_path=repo_path)

        active_project = project_metadata and project_metadata.get('project')
        no_active_project = not active_project
        if not active_project:
            active_project = list(project_paths.keys())[0]

        if no_active_project:
            project_metadata['project'] = active_project
            set_local_project_metadata(repo_path=repo_path, project_metadata=project_metadata)

        if active_project and active_project in project_paths:
            return project_paths[active_project]

    return repo_path


def get_project_paths() -> Dict:
    from mage_ai.data_preparation.shared.utils import get_template_vars_no_db

    metadata_path = get_metadata_path(root_project=True)
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r', encoding='utf-8') as f:
            config_file = Template(f.read()).render(
                **get_template_vars_no_db()
            )
            repo_config = yaml.full_load(config_file) or {}
            paths = repo_config.get('paths') or {}
            if paths:
                projects = paths.get('projects') or {}

                return projects


def set_repo_path(repo_path: str) -> None:
    os.environ[REPO_PATH_ENV_VAR] = repo_path
    sys.path.append(os.path.dirname(repo_path))


def get_repo_name(root_project: bool = False) -> str:
    return os.path.basename(get_repo_path(root_project=root_project))


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
    repo_name = os.path.basename(repo_path)
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
