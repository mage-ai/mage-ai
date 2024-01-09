import os
from pathlib import Path
from typing import Callable

from mage_ai.settings.platform import (
    get_repo_paths_for_file_path,
    project_platform_activated,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.files import find_directory
from mage_ai.shared.path_fixer import get_path_parts, remove_base_repo_directory_name


def from_another_project(file_path: str, other_file_path: str = None) -> bool:
    if not file_path or not project_platform_activated():
        return False

    if other_file_path:
        tup1 = get_path_parts(remove_base_repo_directory_name(file_path))
        tup2 = get_path_parts(remove_base_repo_directory_name(other_file_path))

        if len(tup1) >= 2 and len(tup2) >= 2:
            return tup1[1] != tup2[1]

    active_repo_path = get_repo_path(root_project=False)
    paths = get_repo_paths_for_file_path(
        file_path,
        repo_path=get_repo_path(root_project=True),
    )

    return active_repo_path != paths.get('full_path')


def get_selected_directory_from_file_path(
    file_path: str,
    selector: Callable,
    absolute_path: bool = True,
) -> str:
    # /home/src/default_repo/default_platform/tons_of_dbt_projects/diff_name/models/example/
    # my_second_dbt_model.sql
    full_path_of_file_path = find_directory(
        get_repo_path(root_project=True),
        lambda fn: str(fn).endswith(str(file_path)),
    )

    if not full_path_of_file_path:
        full_path_of_file_path = find_directory(
            get_repo_path(root_project=True),
            lambda fn: str(fn).endswith(str(os.path.dirname(file_path))),
        )

    """
    {
        "full_path": "/home/src/default_repo/default_platform/tons_of_dbt_projects",
        "full_path_relative": "default_platform/tons_of_dbt_projects",
        "path": "tons_of_dbt_projects",
        "root_project_name": "default_platform",
        "root_project_full_path": "/home/src/default_repo/default_platform",
        "uuid": "tons_of_dbt_projects"
    }
    """
    paths_dict = get_repo_paths_for_file_path(
        full_path_of_file_path,
        repo_path=get_repo_path(root_project=True),
    )

    if not paths_dict:
        return

    # /home/src/default_repo/default_platform/tons_of_dbt_projects
    full_path = paths_dict['full_path']
    # /home/src/default_repo/default_platform
    full_path_dir = os.path.dirname(full_path)

    # /home/src/default_repo/default_platform/tons_of_dbt_projects/diff_name/models/example
    file_path_dir = os.path.dirname(full_path_of_file_path)

    dirnames = []
    try:
        # Should return: tons_of_dbt_projects/diff_name/models/example
        diff = Path(file_path_dir).relative_to(full_path_dir)
        dirnames.extend(list(diff.parts))
    except ValueError:
        dirnames.append('')

    dirnames_count = len(dirnames)
    project_full_path = None
    for idx in range(dirnames_count):
        arr = dirnames[:(dirnames_count - idx)]

        project_full_path = find_directory(
            str(os.path.join(full_path_dir, *arr)),
            selector,
        )
        if project_full_path:
            break

    path = os.path.dirname(project_full_path)

    if not absolute_path:
        try:
            diff = Path(path).relative_to(get_repo_path(root_project=True))
            path = diff
        except ValueError:
            pass

    return path
