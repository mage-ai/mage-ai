import asyncio
import os
from typing import Dict, List

import aiofiles
import yaml
from jinja2 import Template

from mage_ai.cache.dbt.constants import PROFILES_FILENAME, PROJECT_FILENAMES
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.files import get_full_file_paths_containing_item
from mage_ai.shared.multi import run_parallel_multiple_args
from mage_ai.shared.path_fixer import remove_base_repo_path


def absolute_project_file_path(relative_project_path: str) -> str:
    file_path = None
    for fn in PROJECT_FILENAMES:
        file_path = os.path.join(base_repo_path(), relative_project_path, fn)
        if os.path.exists(file_path):
            return file_path
    return file_path


def get_model_directories(dirname: str = None, project: Dict = None) -> List[str]:
    paths = []
    if project:
        dirname = dirname or os.path.join(
            base_repo_path(),
            os.path.dirname(project.get('file_path') or ''),
        )
        paths = project.get('model-paths') or []

    return dirname, paths


def get_models(dirname: str = None, project: Dict = None) -> List[str]:
    dirname, paths = get_model_directories(dirname=dirname, project=project)
    models = []
    for model_dirname in paths:
        arr = get_full_file_paths_containing_item(
            os.path.join(dirname, model_dirname),
            lambda fn: str(fn).endswith('.sql'),
        )
        models.extend([remove_base_repo_path(fn) for fn in arr])

    return sorted(models)


def get_schema_file_paths(dirname: str = None, project: Dict = None) -> List[str]:
    dirname, paths = get_model_directories(dirname=dirname, project=project)
    file_paths = []
    for model_dirname in paths:
        arr = get_full_file_paths_containing_item(
            os.path.join(dirname, model_dirname),
            lambda fn: str(fn).endswith('.yml') or str(fn).endswith('.yaml'),
        )
        file_paths.extend(arr)
    return file_paths


async def read_content_async(file_path: str) -> Dict:
    if os.path.exists(file_path):
        async with aiofiles.open(file_path, mode='r') as f:
            content = await f.read()
            try:
                content_interpolated = Template(content).render(
                    variables=lambda x: x,
                    **get_template_vars(),
                )
            except Exception as err:
                print(f'[WARNING] DBT.cache.read_content_async {file_path}: {err}.')
                content_interpolated = content
            config = yaml.safe_load(content_interpolated) or {}
            config['file_path'] = remove_base_repo_path(file_path)
            config['uuid'] = os.path.dirname(remove_base_repo_path(file_path))
            return config


async def load_content_async(file_path: str):
    dirname = os.path.dirname(file_path)
    project = await read_content_async(file_path)
    profiles = await read_content_async(os.path.join(dirname, PROFILES_FILENAME))
    models = get_models(dirname=dirname, project=project)

    schema_file_paths = get_schema_file_paths(dirname=dirname, project=project)
    schema_dicts = await asyncio.gather(*[read_content_async(fp) for fp in schema_file_paths])

    return dict(
        models=models,
        profiles=__clean_profiles(profiles),
        project=project,
        schema=schema_dicts,
    )


async def build_mapping_async(file_path: str) -> Dict:
    project_file_paths = get_full_file_paths_containing_item(
        file_path,
        lambda fn: any([str(fn).endswith(filename) for filename in PROJECT_FILENAMES]),
    )

    project_dicts = await asyncio.gather(*[load_content_async(fp) for fp in project_file_paths])

    mapping = {}
    for project_dict in project_dicts:
        file_path = os.path.dirname((project_dict.get('project') or {}).get('file_path'))
        mapping[file_path] = project_dict

    return mapping


def read_content(file_path: str) -> Dict:
    if os.path.exists(file_path):
        with open(file_path, mode='r') as f:
            content = f.read()
            try:
                content_interpolated = Template(content).render(
                    variables=lambda x: x,
                    **get_template_vars(),
                )
            except Exception as err:
                print(f'[WARNING] DBT.cache.read_content_async {file_path}: {err}.')
                content_interpolated = content
            config = yaml.safe_load(content_interpolated) or {}
            config['file_path'] = remove_base_repo_path(file_path)
            return config


def load_content(file_path: str):
    dirname = os.path.dirname(file_path)
    project = read_content(file_path)
    profiles = read_content(os.path.join(dirname, PROFILES_FILENAME))
    models = get_models(dirname=dirname, project=project)

    schema_file_paths = get_schema_file_paths(dirname=dirname, project=project)
    schema_dicts = run_parallel_multiple_args(load_content, schema_file_paths)

    return dict(
        models=models,
        profiles=__clean_profiles(profiles),
        project=project,
        schema=schema_dicts,
    )


def build_mapping(file_path: str) -> Dict:
    project_file_paths = get_full_file_paths_containing_item(
        file_path,
        lambda fn: any([str(fn).endswith(filename) for filename in PROJECT_FILENAMES]),
    )

    project_dicts = run_parallel_multiple_args(load_content, project_file_paths)

    mapping = {}
    for project_dict in project_dicts:
        file_path = os.path.dirname((project_dict.get('project') or {}).get('file_path'))
        mapping[file_path] = project_dict

    return mapping


def get_project_path_from_file_path(
    file_path: str,
    walk_up_parents: bool = False,
) -> str:
    project_file_paths = get_full_file_paths_containing_item(
        file_path,
        lambda fn: any([str(fn).endswith(filename) for filename in PROJECT_FILENAMES]),
    )
    if project_file_paths:
        return remove_base_repo_path(os.path.dirname(project_file_paths[0]))

    if not project_file_paths and walk_up_parents:
        base_repo_path_value = base_repo_path()

        while not project_file_paths and base_repo_path_value != file_path:
            file_path = os.path.dirname(file_path)
            project_file_paths = get_project_path_from_file_path(file_path, walk_up_parents=False)

        return project_file_paths


def __clean_profiles(profiles: Dict) -> Dict:
    if not profiles:
        return profiles

    mapping = profiles.copy()
    for project_name, profile_dict in profiles.items():
        if not isinstance(profile_dict, dict) or not profile_dict.get('outputs'):
            continue

        outputs = profile_dict.get('outputs') or {}
        for target in outputs.keys():
            mapping[project_name]['outputs'][target] = dict(
                type=mapping[project_name]['outputs'][target].get('type'),
            )

    return mapping
