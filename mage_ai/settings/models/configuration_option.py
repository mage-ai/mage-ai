import asyncio
import os
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, Union

import aiofiles
import yaml
from jinja2 import Template

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.shared.utils import get_template_vars
from mage_ai.settings.platform import project_platform_activated
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.files import get_full_file_paths_containing_multi_items
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.models import BaseDataClass


async def read_file(full_path: str) -> str:
    async with aiofiles.open(full_path, mode='r') as f:
        content = await f.read()
        try:
            content_interpolated = Template(content).render(
                variables=lambda x: x,
                **get_template_vars(),
            )
        except Exception as err:
            print(f'[WARNING] DBT.cache.read_content_async {full_path}: {err}.')
            content_interpolated = content

        config = yaml.safe_load(content_interpolated) or {}

        return config


class ConfigurationType(str, Enum):
    DBT = 'dbt'


class OptionType(str, Enum):
    PROFILES = 'profiles'
    PROJECTS = 'projects'
    TARGETS = 'targets'


@dataclass
class ConfigurationOption(BaseDataClass):
    configuration_type: ConfigurationType = None
    name: str = None
    option: Dict = None
    option_type: OptionType = None
    resource_type: EntityName = None
    uuid: str = None

    def __post_init__(self):
        self.serialize_attribute_enum('configuration_type', ConfigurationType)
        self.serialize_attribute_enum('option_type', OptionType)
        self.serialize_attribute_enum('resource_type', EntityName)

    def to_dict(self) -> Dict:
        return merge_dict(super().to_dict(), dict(
            configuration_type=(
                self.configuration_type.value if self.configuration_type
                else self.configuration_type
            ),
            option_type=(
                self.option_type.value if self.option_type else self.option_type
            ),
            resource_type=(
                self.resource_type.value if self.resource_type else self.resource_type
            ),
        ))

    @classmethod
    async def fetch(
        self,
        configuration_type: ConfigurationType,
        option_type: OptionType,
        resource_type: EntityName,
        pipeline: Pipeline = None,
        resource_uuid: Union[str, int] = None,
    ):
        if ConfigurationType.DBT == configuration_type:
            repo_path = get_repo_path(root_project=project_platform_activated())

            project_path_only = None
            if pipeline and EntityName.Block == resource_type and resource_uuid is not None:
                block = pipeline.get_block(resource_uuid)
                if block and BlockType.DBT == block.type:
                    project_path_only = block.project_path

            if OptionType.PROJECTS == option_type or OptionType.PROFILES == option_type:
                config_full_paths = get_full_file_paths_containing_multi_items(
                    repo_path,
                    dict(
                        project=lambda x: x.startswith('dbt_project.y'),
                        profile=lambda x: x.startswith('profiles.y'),
                    ),
                    exclude_hidden_dir=True,
                )
                project_full_paths = config_full_paths['project']
                profile_full_paths_init = config_full_paths['profile']

                if project_path_only is not None:
                    project_full_paths2 = []
                    for fp in project_full_paths:
                        try:
                            Path(fp).relative_to(project_path_only)
                            project_full_paths2.append(fp)
                        except ValueError:
                            pass
                    project_full_paths = project_full_paths2

                profile_full_paths = []
                profile_full_paths_by_project = {}
                for project_full_path in project_full_paths:
                    profile_full_paths_by_project[project_full_path] = []

                    for fp in profile_full_paths_init:
                        if os.path.dirname(project_full_path) in os.path.dirname(fp):
                            profile_full_paths.append(fp)
                            profile_full_paths_by_project[project_full_path].append(fp)

                projects = await asyncio.gather(
                    *[read_file(full_path) for full_path in project_full_paths]
                )
                profiles = await asyncio.gather(
                    *[read_file(full_path) for full_path in profile_full_paths]
                )

                profiles_mapping = {k: profiles[idx] for idx, k in enumerate(profile_full_paths)}
                results = []
                for idx, project in enumerate(projects):
                    project_full_path = project_full_paths[idx]
                    profile_full_paths = profile_full_paths_by_project[project_full_path]

                    profiles_arr = []
                    for profile_fp in profile_full_paths:
                        if profile_fp not in profiles_mapping:
                            continue

                        profile = profiles_mapping[profile_fp]

                        for project_name, opts in profile.items():
                            target = opts.get('target')
                            targets = list((opts.get('outputs') or {}).keys())

                            profiles_arr.append(dict(
                                full_path=str(Path(profile_fp).relative_to(repo_path)),
                                project=project_name,
                                target=target,
                                targets=targets,
                            ))

                    full_path = str(Path(project_full_path).relative_to(repo_path))

                    option_uuid = os.path.dirname(full_path)
                    results.append(ConfigurationOption.load(
                        configuration_type=configuration_type,
                        name=project.get('name'),
                        option=dict(
                            profiles=profiles_arr,
                            project=merge_dict(project, dict(
                                full_path=full_path,
                                uuid=option_uuid,
                            )),
                        ),
                        option_type=option_type,
                        resource_type=resource_type,
                        uuid=option_uuid,
                    ))

                return results
