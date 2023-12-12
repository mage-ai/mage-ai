from mage_ai.settings.platform import get_repo_paths_for_file_path, has_settings
from mage_ai.settings.repo import get_repo_path


def from_another_project(file_path: str) -> bool:
    if not has_settings():
        return False

    active_repo_path = get_repo_path(root_project=False)
    paths = get_repo_paths_for_file_path(
        repo_path=get_repo_path(root_project=True),
        file_path=file_path,
    )

    return active_repo_path != paths.get('full_path')
