import os

from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find


def get_directory_of_file_path(file_path: str) -> str:
    # file_path: default_repo/main_dbt/demo/models/example/my_second_dbt_model.sql
    repo_path = get_repo_path(root_project=True)

    found = False
    dirname = os.path.dirname(file_path)
    while not found and repo_path != dirname:
        filenames = os.listdir(dirname)
        found = find(
            lambda fn: fn.startswith('dbt_project.y') and os.path.isfile(os.path.join(dirname, fn)),
            filenames,
        )
        if not found:
            dirname = os.path.dirname(dirname)

    if found:
        return dirname
