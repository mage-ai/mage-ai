import os
from pathlib import Path
from typing import Dict

import yaml
from jinja2 import Template

from mage_ai.settings import ENABLE_PROJECT_PLATFORM
from mage_ai.settings.constants import PROJECT_METADATA_FILENAME
from mage_ai.settings.platform.constants import (
    LOCAL_PLATFORM_SETTINGS_FILENAME,
    PLATFORM_SETTINGS_FILENAME,
)
from mage_ai.settings.utils import base_repo_name, base_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.hash import combine_into, dig, extract, merge_dict
from mage_ai.shared.io import safe_write


def activate_project(project_name: str) -> None:
    if project_name:
        platform_settings = __local_platform_settings() or {}
        if 'projects' not in platform_settings:
            platform_settings['projects'] = {}

        platform_settings['projects'][project_name] = merge_dict(
            platform_settings['projects'].get(project_name) or {},
            dict(active=True),
        )

        projects = platform_settings['projects'] or {}
        for key in projects.keys():
            if key == project_name:
                continue
            platform_settings['projects'][key] = merge_dict(
                platform_settings['projects'].get(key) or {},
                dict(active=False),
            )

        __update_local_platform_settings(platform_settings)


def build_repo_path_for_all_projects(
    repo_path: str = None,
    mage_projects_only: bool = False
) -> Dict:
    mapping = {}
    settings = project_platform_settings(repo_path=repo_path, mage_projects_only=mage_projects_only)
    root_project_path = base_repo_path()
    root_project_name = base_repo_name()

    for project_name, project_settings in settings.items():
        path_override = project_settings.get('path') or project_name
        mapping[project_name] = dict(
            full_path=os.path.join(root_project_path, path_override),
            full_path_relative=os.path.join(root_project_name, path_override),
            path=path_override,
            root_project_name=root_project_name,
            root_project_full_path=root_project_path,
            uuid=project_name,
        )

    return mapping


def repo_path_from_database_query_to_project_repo_path(
    key: str,
    repo_path: str = None,
) -> Dict:
    mapping = {}

    repo_paths = build_repo_path_for_all_projects(repo_path=repo_path, mage_projects_only=True)
    for paths in repo_paths.values():
        full_path = paths['full_path']
        mapping[full_path] = full_path

    settings = project_platform_settings(repo_path=repo_path, mage_projects_only=True)
    for project_name, setting in settings.items():
        query_arr_paths = []
        query_arr = dig(setting, ['database', 'query', key])
        if query_arr:
            query_arr_paths = [os.path.join(*[part for part in [
                os.path.dirname(base_repo_path()),
                query_alias,
            ] if len(part) >= 1]) for query_alias in query_arr]

        paths = repo_paths[project_name]
        full_path = paths['full_path']

        for query_path in query_arr_paths:
            mapping[query_path] = full_path

    return mapping


def get_repo_paths_for_file_path(file_path: str, repo_path: str = None) -> Dict:
    result = None

    repo_paths_all = build_repo_path_for_all_projects(repo_path=repo_path)
    for settings in repo_paths_all.values():
        full_path = settings['full_path']
        path = settings['path']
        root_path = base_repo_name()
        path_with_root = os.path.join(root_path, path)

        try:
            if (
                str(file_path).startswith(full_path) or
                (
                    str(file_path).startswith(root_path) and
                    Path(file_path).relative_to(path_with_root)
                ) or
                (
                    str(file_path).startswith(path) and
                    Path(file_path).relative_to(path)
                )
            ):
                result = settings
                break
        except ValueError:
            pass

    return result


def build_active_project_repo_path(repo_path: str = None) -> str:
    if not repo_path:
        repo_path = base_repo_path()

    settings = project_platform_settings(repo_path=repo_path, mage_projects_only=True)
    active_project = active_project_settings(settings=settings)
    no_active_project = not active_project

    items = list(settings.items() or [])
    if no_active_project and items:
        project_name, project_settings = items[0]
        active_project = merge_dict(
            project_settings or {},
            dict(
                active=True,
                uuid=project_name,
            ),
        )

    if no_active_project and active_project:
        __update_local_platform_settings(
            dict(projects={
                active_project['uuid']: dict(active=True),
            }),
            merge=True,
            repo_path=repo_path,
        )

    if active_project:
        path_override = active_project.get('path') or active_project.get('uuid')

        return os.path.join(repo_path, path_override)

    return repo_path


def project_platform_activated() -> bool:
    return ENABLE_PROJECT_PLATFORM and os.path.exists(platform_settings_full_path())


def platform_settings() -> Dict:
    config = __load_platform_settings(platform_settings_full_path()) or {}
    config['projects'] = merge_dict(
        __get_projects_of_any_type() or {},
        (config.get('projects') if config else {}) or {},
    )
    return config


def active_project_settings(
    get_default: bool = False,
    repo_path: str = None,
    settings: Dict = None,
) -> Dict:
    if not settings:
        settings = project_platform_settings(repo_path=repo_path, mage_projects_only=True)

    items = list(settings.items())
    if not items:
        return

    project_settings_tup = find(
        lambda tup: tup and len(tup) >= 2 and (tup[1] or {}).get('active'),
        items,
    )

    if not project_settings_tup and get_default:
        project_settings_tup = items[0]

    if project_settings_tup:
        project_name, project_settings = project_settings_tup

        return merge_dict(
            project_settings or {},
            dict(uuid=project_name),
        )


def project_platform_settings(repo_path: str = None, mage_projects_only: bool = False) -> Dict:
    mapping = (__combined_platform_settings(repo_path=repo_path) or {}).get('projects')

    if mage_projects_only:
        select_keys = []

        for project_name, settings in mapping.items():
            if 'is_project' not in settings or settings.get('is_project'):
                select_keys.append(project_name)

        return extract(mapping, select_keys)

    return mapping


def __combined_platform_settings(repo_path: str = None) -> Dict:
    child = (platform_settings() or {}).copy()
    parent = (__local_platform_settings(repo_path=repo_path) or {}).copy()
    combine_into(child, parent)
    return parent


def git_settings(repo_path: str = None) -> Dict:
    git_dict = {}

    settings = active_project_settings(get_default=True, repo_path=repo_path)
    if settings and settings.get('git'):
        git_dict = settings.get('git') or {}

    if git_dict.get('path'):
        git_dict['path'] = os.path.join(
            os.path.dirname(platform_settings_full_path()),
            git_dict['path'],
        )
    else:
        git_dict['path'] = build_active_project_repo_path(repo_path=repo_path)

    return git_dict


def platform_settings_full_path() -> str:
    return os.path.join(base_repo_path(), PLATFORM_SETTINGS_FILENAME)


def __get_projects_of_any_type() -> Dict:
    mapping = {}

    repo_path = base_repo_path()
    for path in os.listdir(repo_path):
        project_path = os.path.join(repo_path, path)
        if not os.path.isdir(project_path):
            continue

        is_project = False
        is_project_platform = False

        for path2 in os.listdir(project_path):
            if PLATFORM_SETTINGS_FILENAME == path2:
                is_project_platform = True
            elif PROJECT_METADATA_FILENAME == path2:
                is_project = True

        mapping[path] = dict(
            is_project=is_project,
            is_project_platform=is_project_platform,
            uuid=path,
        )

    return mapping


def __load_platform_settings(full_path: str) -> Dict:
    from mage_ai.data_preparation.shared.utils import get_template_vars_no_db

    # default_platform/tons_of_dbt_projects/demo2/models/example/restaurant_user_transactions.sql

    settings = None
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            content = Template(f.read()).render(**get_template_vars_no_db())
            settings = yaml.full_load(content) or {}

    return settings


def local_platform_settings_full_path(repo_path: str = None) -> str:
    from mage_ai.settings.repo import get_variables_dir

    variables_dir = get_variables_dir(repo_path=repo_path, root_project=True)
    return os.path.join(variables_dir, LOCAL_PLATFORM_SETTINGS_FILENAME)


def __local_platform_settings(repo_path: str = None) -> Dict:
    return __load_platform_settings(local_platform_settings_full_path(repo_path=repo_path))


def __update_local_platform_settings(
    platform_settings: Dict,
    merge: bool = False,
    repo_path: str = None,
) -> None:
    if merge:
        child = (__local_platform_settings(repo_path=repo_path) or {}).copy()
        parent = platform_settings.copy()
        combine_into(child, parent)
        platform_settings = parent

    full_path = local_platform_settings_full_path(repo_path=repo_path)
    content = yaml.dump(platform_settings)
    safe_write(full_path, content)
