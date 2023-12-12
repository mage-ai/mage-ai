import os

from mage_ai.settings.platform import get_repo_paths_for_file_path
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.files import find_directory


def get_directory_of_file_path(file_path: str) -> str:
    full_path_of_file_path = find_directory(
        get_repo_path(root_project=True),
        lambda fn: str(fn).endswith(str(file_path)),
    )
    paths_dict = get_repo_paths_for_file_path(
        get_repo_path(root_project=True),
        full_path_of_file_path,
    )
    full_path = paths_dict['full_path']

    project_full_path = find_directory(
        get_repo_path(root_project=True),
        lambda fn: str(fn).startswith(str(os.path.dirname(full_path))) and (
            str(fn).endswith(os.path.join(os.sep, 'dbt_project.yml')) or
            str(fn).endswith(os.path.join(os.sep, 'dbt_project.yaml'))
        ),
    )

    return os.path.dirname(project_full_path)
