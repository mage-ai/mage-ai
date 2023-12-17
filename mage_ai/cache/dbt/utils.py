import asyncio
import os
from typing import Dict

import aiofiles
import yaml

from mage_ai.cache.dbt.constants import PROFILES_FILENAME
from mage_ai.shared.files import get_full_file_paths_containing_item


async def build_mapping(file_path: str) -> Dict:
    project_file_paths = get_full_file_paths_containing_item(
        file_path,
        lambda fn: (
            str(fn).endswith('dbt_project.yml') or
            str(fn).endswith('dbt_project.yaml')
        ),
    )

    project_dicts = await asyncio.gather(*[load_content(fp) for fp in project_file_paths])

    mapping = {}
    for project_dict in project_dicts:
        file_path = (project_dict.get('project') or {}).get('file_path')
        mapping[file_path] = project_dict

    return mapping


async def load_content(file_path: str):
    dirname = os.path.dirname(file_path)

    project = None
    async with aiofiles.open(file_path, mode='r') as f:
        project = yaml.safe_load(await f.read()) or {}
        project['file_path'] = file_path

    profiles = None
    file_path_profiles = os.path.join(dirname, PROFILES_FILENAME)
    if os.path.exists(file_path_profiles):
        async with aiofiles.open(file_path_profiles, mode='r') as f:
            profiles = yaml.safe_load(await f.read()) or {}
            profiles['file_path'] = file_path_profiles

    models = []
    if project and project.get('model-paths'):
        for model_dirname in (project.get('model-paths') or []):
            models.extend(get_full_file_paths_containing_item(
                os.path.join(dirname, model_dirname),
                lambda fn: str(fn).endswith('.sql'),
            ))

    return dict(
        models=models,
        profiles=profiles,
        project=project,
    )
