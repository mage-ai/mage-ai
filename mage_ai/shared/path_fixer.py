import os
from pathlib import Path
from typing import List

from mage_ai.data_preparation.models.block.platform import from_another_project
from mage_ai.settings.platform import has_settings
from mage_ai.settings.repo import get_repo_path


def remove_directory_names(
    file_path: str,
    directory_names_to_remove: List[str] = None,  # Additional directory names to remove
    file_from_another_project: bool = None,
    max_repo_names_to_remove: int = None,  # Max names to remove starting from the root project
    project_has_settings: bool = None,
    use_absolute_paths: bool = None,  # Resolve using absolute paths
) -> str:
    if use_absolute_paths is None:
        use_absolute_paths = os.path.isabs(file_path)

    if project_has_settings is None:
        project_has_settings = has_settings()

    # You can’t have files from another project unless there is a settings file
    # in the root directory
    if file_from_another_project is None:
        if project_has_settings:
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
        if project_has_settings:
            # /home/src/default_repo
            paths.append(get_repo_path(root_project=True, **extra_kwargs))
    else:
        # default_repo
        # default_repo/demo_project
        paths.append(get_repo_path(absolute_path=False, root_project=False, **extra_kwargs))
        if project_has_settings:
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
            full_path = diff
        except ValueError:
            continue

    return full_path
