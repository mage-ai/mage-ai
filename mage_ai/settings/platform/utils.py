import os
from typing import Dict, List, Tuple

from mage_ai.data_preparation.models.constants import (
    PIPELINE_CONFIG_FILE,
    PIPELINES_FOLDER,
)
from mage_ai.settings.platform import (
    build_repo_path_for_all_projects,
    get_repo_paths_for_file_path,
    project_platform_activated,
    repo_path_from_database_query_to_project_repo_path,
)
from mage_ai.shared.files import find_directory


def get_pipeline_from_platform(
    pipeline_uuid: str,
    check_if_exists: bool = False,
    repo_path: str = None,
    mapping: Dict = None,
    use_repo_path: bool = False,
):
    from mage_ai.data_preparation.models.pipeline import Pipeline

    if not project_platform_activated():
        return Pipeline.get(pipeline_uuid, check_if_exists=check_if_exists)

    if not mapping:
        mapping = repo_path_from_database_query_to_project_repo_path('pipeline_schedules')

    if repo_path and not use_repo_path and mapping:
        repo_path = mapping.get(repo_path)
        if repo_path is None or str(repo_path) == str(None):
            repo_path = None

    return Pipeline.get(
        pipeline_uuid,
        repo_path=repo_path,
        all_projects=False if repo_path else True,
        use_repo_path=use_repo_path,
    )


async def get_pipeline_from_platform_async(
    pipeline_uuid: str,
    repo_path: str = None,
    mapping: Dict = None,
    use_repo_path: bool = False,
):
    from mage_ai.data_preparation.models.pipeline import Pipeline

    if not project_platform_activated():
        return await Pipeline.get_async(pipeline_uuid)

    if not mapping:
        mapping = repo_path_from_database_query_to_project_repo_path('pipeline_schedules')

    if repo_path and not use_repo_path:
        repo_path = mapping.get(repo_path)
        if repo_path is None or str(repo_path) == str(None):
            repo_path = None

    return await Pipeline.get_async(
        pipeline_uuid,
        repo_path=repo_path,
        all_projects=False if repo_path else True,
        use_repo_path=use_repo_path,
    )


def get_pipeline_config_path(pipeline_uuid: str) -> Tuple[str, str]:
    from mage_ai.settings.repo import get_repo_path

    repo_path_active = get_repo_path(root_project=False)

    path_relative = os.path.join(PIPELINES_FOLDER, pipeline_uuid, PIPELINE_CONFIG_FILE)

    full_paths = [
        repo_path_active,
    ] + [fp for fp in full_paths_for_all_projects() if fp != repo_path_active]

    match_config_path = None
    match_repo_path = None
    for full_path in full_paths:
        def __select(fn: str, path_relative=path_relative):
            return str(fn).endswith(path_relative)

        full_filename = find_directory(
            full_path,
            comparator=__select,
        )
        if full_filename:
            paths = get_repo_paths_for_file_path(
                file_path=full_filename,
                mage_projects_only=True,
            )
            match_config_path = full_filename
            match_repo_path = (paths.get('full_path') if paths else None) or full_path

        if match_config_path:
            break

    return match_config_path, match_repo_path


def full_paths_for_all_projects() -> List[str]:
    return [d.get(
        'full_path',
    ) for d in build_repo_path_for_all_projects(mage_projects_only=True).values()]
