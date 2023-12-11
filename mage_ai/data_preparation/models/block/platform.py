import os

from mage_ai.settings.platform import has_settings
from mage_ai.settings.repo import get_repo_path


def from_another_project(pipeline, file_path: str) -> bool:
    if not has_settings():
        return False

    repo_path = get_repo_path(root_project=False)
    repo_path_root = get_repo_path(root_project=True)

    if repo_path == repo_path_root:
        return False

    return os.path.commonpath([
        pipeline.dir_path,
        os.path.join(repo_path_root, file_path),
    ]) == repo_path_root
