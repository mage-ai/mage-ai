import os
from pathlib import Path
from typing import List, Tuple

from mage_ai.data_preparation.models.block.platform.utils import from_another_project
from mage_ai.settings.platform import get_repo_paths_for_file_path
from mage_ai.settings.platform import (
    project_platform_activated as project_platform_activated_check,
)
from mage_ai.settings.repo import get_repo_path


def convert_absolute_path_to_relative(file_path: str) -> str:
    return os.path.join(*Path(file_path).parts[1:])


def convert_relative_path_to_absolute(file_path: str) -> str:
    return os.path.join(os.sep, file_path)


def get_path_parts(file_path: str) -> Tuple[str, str, str]:
    paths = get_repo_paths_for_file_path(file_path)

    root_project_full_path = paths['root_project_full_path']
    full_path_relative = paths['full_path_relative']
    path = paths['path']

    file_path_base = None

    # The file path either has both the root project name and the nested project name
    # or just has the nested project name in it.
    for path2 in [
        full_path_relative,
        path,
    ]:
        if file_path_base:
            break
        try:
            file_path_base = Path(file_path).relative_to(path2)
        except ValueError:
            pass

    return (root_project_full_path, path, file_path_base)


def add_directory_names(
    file_path: str,
    file_from_another_project: bool = None,
    project_platform_activated: bool = None,
) -> str:
    if project_platform_activated is None:
        project_platform_activated = project_platform_activated_check()

    # You can’t have files from another project unless there is a settings file
    # in the root directory
    if file_from_another_project is None:
        if project_platform_activated:
            file_from_another_project = from_another_project(file_path)
        else:
            file_from_another_project = False

    file_path_is_absolute = os.path.isabs(file_path)

    paths = []
    if file_path_is_absolute:
        # /home/src/default_repo
        # /home/src/default_repo/demo_project
        paths.append(get_repo_path(root_project=False, file_path=file_path))
        if project_platform_activated:
            # /home/src/default_repo
            paths.append(get_repo_path(root_project=True, file_path=file_path))
    else:
        # default_repo
        # default_repo/demo_project
        paths.append(get_repo_path(absolute_path=False, root_project=False, file_path=file_path))
        if project_platform_activated:
            # default_repo
            paths.append(get_repo_path(absolute_path=False, root_project=True, file_path=file_path))

    file_path_new = file_path
    for path in paths:
        # First loop:
        # /home/src/default_repo
        # /home/src/default_repo/demo_project
        try:
            diff = Path(file_path_new).relative_to(path)
            file_path_new = diff
        except ValueError:
            continue

    if os.path.isabs(file_path_new):
        file_path_new = convert_absolute_path_to_relative(file_path_new)

    full_path = get_repo_paths_for_file_path(
        repo_path=get_repo_path(absolute_path=True, root_project=True, file_path=file_path),
        file_path=file_path,
    )['full_path']

    return os.path.join(full_path, file_path_new)


def remove_directory_names(
    file_path: str,
    directory_names_to_remove: List[str] = None,  # Additional directory names to remove
    file_from_another_project: bool = None,
    max_repo_names_to_remove: int = None,  # Max names to remove starting from the root project
    project_platform_activated: bool = None,
    use_absolute_paths: bool = None,  # Resolve using absolute paths
) -> str:
    if use_absolute_paths is None:
        use_absolute_paths = os.path.isabs(file_path)

    if project_platform_activated is None:
        project_platform_activated = project_platform_activated_check()

    # You can’t have files from another project unless there is a settings file
    # in the root directory
    if file_from_another_project is None:
        if project_platform_activated:
            file_from_another_project = from_another_project(file_path)
        else:
            file_from_another_project = False

    extra_kwargs = {}
    if file_from_another_project:
        extra_kwargs['file_path'] = file_path

    paths = []
    if use_absolute_paths:
        # /home/src/default_repo
        # /home/src/default_repo/demo_project
        paths.append(get_repo_path(root_project=False, **extra_kwargs))
        if project_platform_activated:
            # /home/src/default_repo
            paths.append(get_repo_path(root_project=True, **extra_kwargs))
    else:
        # default_repo
        # default_repo/demo_project
        paths.append(get_repo_path(absolute_path=False, root_project=False, **extra_kwargs))
        if project_platform_activated:
            # default_repo
            paths.append(get_repo_path(absolute_path=False, root_project=True, **extra_kwargs))

    if directory_names_to_remove:
        paths.extend(directory_names_to_remove or [])

    if max_repo_names_to_remove is not None:
        # If max is 1, then the deepest directory is removed. For example,
        # /home/src/default_repo
        # /home/src/default_repo/demo_project
        # Max 1 will remove /home/src/default_repo/demo_project, which removes default_repo
        paths = paths[(2 - max_repo_names_to_remove):]

    # Loop 0:
    #       demo_project
    # Loop 1
    #       default_repo
    for path in paths:
        try:
            diff = Path(file_path).relative_to(path)
            file_path = diff
        except ValueError:
            continue

    return file_path
