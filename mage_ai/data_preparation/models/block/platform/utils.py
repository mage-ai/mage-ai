import os
from pathlib import Path
from typing import Callable

from mage_ai.settings.platform import (
    get_repo_paths_for_file_path,
    project_platform_activated,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.files import find_directory


def from_another_project(file_path: str) -> bool:
    if not file_path or not project_platform_activated():
        return False

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
    full_path_of_file_path = find_directory(
        get_repo_path(root_project=True),
        lambda fn: str(fn).endswith(str(file_path)),
    )
    paths_dict = get_repo_paths_for_file_path(
        full_path_of_file_path,
        repo_path=get_repo_path(root_project=True),
    )
    full_path = paths_dict['full_path']

    project_full_path = find_directory(
        get_repo_path(root_project=True),
        lambda fn: str(fn).startswith(str(os.path.dirname(full_path))) and selector(fn),
    )

    path = os.path.dirname(project_full_path)

    if not absolute_path:
        try:
            diff = Path(path).relative_to(get_repo_path(root_project=True))
            path = diff
        except ValueError:
            pass

    return path
