import os
from pathlib import Path
from typing import Tuple

from mage_ai.settings.platform import get_repo_paths_for_file_path
from mage_ai.settings.repo import get_repo_path
from mage_ai.settings.utils import base_repo_dirname, base_repo_name, base_repo_path
from mage_ai.shared.files import find_directory


def add_absolute_path(file_path: str, add_base_repo_path: bool = True) -> str:
    repo_path = get_repo_path(root_project=True)
    repo_path_name = Path(repo_path).name

    full_path = None
    if os.path.isabs(file_path):
        full_path = file_path
    else:
        try:
            # If the relative path already contains the root project name, return it
            diff = Path(file_path).relative_to(repo_path_name)
            relative_file_path = str(diff)
            full_path = os.path.join(repo_path, relative_file_path)
        except ValueError:
            # Relative path doesn’t contain the repo name
            # Check to see if the first directory is exists right under the root folder
            parts = Path(file_path).parts
            if len(parts) >= 1:
                full_path = os.path.join(repo_path, parts[0])
                if os.path.exists(full_path):
                    full_path = os.path.join(repo_path, file_path)
                elif os.path.exists(os.path.join(repo_path, 'dbt', parts[0])):
                    # DBT v1 paths
                    full_path = os.path.join(repo_path, 'dbt', file_path)
                else:
                    full_path = find_directory(repo_path, lambda x: x.endswith(file_path))

    if full_path:
        # Remove the repo path
        if add_base_repo_path:
            return str(full_path)
        else:
            return str(Path(full_path).relative_to(base_repo_path()))


def add_root_repo_path_to_relative_path(relative_file_path: str) -> str:
    repo_path = get_repo_path(root_project=True)
    repo_path_name = Path(repo_path).name

    try:
        # If the relative path already contains the root project name, return it
        diff = Path(relative_file_path).relative_to(repo_path_name)
        relative_file_path = str(diff)
    except ValueError:
        pass

    return os.path.join(repo_path, relative_file_path)


def convert_absolute_path_to_relative(file_path: str) -> str:
    return os.path.join(*Path(file_path).parts[1:])


def convert_relative_path_to_absolute(file_path: str) -> str:
    return os.path.join(os.sep, file_path)


def remove_base_repo_path(file_path: str) -> str:
    """
    Removes /home/src/default_platform from
    /home/src/default_platform/dbt/demo == dbt/demo
    /home/src/default_platform/default_repo/dbt/demo == default_repo/dbt/demo
    """
    try:
        path = Path(file_path).relative_to(base_repo_path())
        return str(path)
    except ValueError:
        return file_path


def remove_base_repo_name(file_path: str) -> str:
    """
    Removes default_platform from
    default_platform/dbt/demo == dbt/demo
    default_platform/default_repo/dbt/demo == default_repo/dbt/demo
    """
    try:
        path = Path(file_path).relative_to(base_repo_name())
        return str(path)
    except ValueError:
        return file_path


def remove_base_repo_path_or_name(file_path: str) -> str:
    if not file_path:
        return

    if os.path.isabs(file_path):
        value = str(remove_base_repo_path(file_path))
    else:
        value = str(remove_base_repo_name(file_path))

    if len(value) == 0 or value == '.':
        return base_repo_name()
    else:
        return value


def remove_base_repo_directory_name(file_path: str) -> str:
    """
    Removes /home/src from
    /home/src/default_platform/dbt/demo == default_platform/dbt/demo
    /home/src/default_platform/default_repo/dbt/demo == default_platform/default_repo/dbt/demo
    """
    try:
        path = Path(file_path).relative_to(base_repo_dirname())
        return str(path)
    except ValueError:
        return file_path


def remove_repo_names(file_path: str) -> str:
    try:
        path = Path(file_path).relative_to(get_repo_path(
            absolute_path=False,
            file_path=file_path,
            root_project=False,
        ))
        return str(path)
    except ValueError:
        return file_path


def get_path_parts(file_path: str) -> Tuple[str, str, str]:
    paths = get_repo_paths_for_file_path(file_path)

    if not paths:
        return None

    root_project_full_path = paths['root_project_full_path']
    full_path_relative = paths['full_path_relative']
    path = paths['path']

    paths_to_remove = []
    file_path_base = None

    if os.path.isabs(file_path):
        paths_to_remove = [
            paths['full_path'],
            path,
        ]
    else:
        paths_to_remove = [
            full_path_relative,
            path,
        ]

    # The file path either has both the root project name and the nested project name
    # or just has the nested project name in it.
    for path_inner in paths_to_remove:
        if file_path_base:
            break
        try:
            file_path_base = Path(file_path).relative_to(path_inner)
        except ValueError:
            pass

    return (root_project_full_path, path, str(file_path_base))
