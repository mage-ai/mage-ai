import asyncio
import os
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict

import aiofiles
import yaml

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.file import get_full_file_paths_containing_item
from mage_ai.settings.platform import has_settings
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.models import BaseDataClass


async def read_file(full_path: str) -> str:
    async with aiofiles.open(full_path, mode='r') as f:
        return yaml.safe_load(await f.read()) or {}


class OptionType(str, Enum):
    PROFILES = 'profiles'
    PROJECTS = 'projects'
    TARGETS = 'targets'


class ConfigurationType(str, Enum):
    DBT = 'dbt'


@dataclass
class ConfigurationOption(BaseDataClass):
    configuration_type: str = None
    metadata: Dict = None
    option: Dict = None
    option_type: str = None
    resource_type: str = None
    uuid: str = None

    def __post_init__(self):
        self.serialize_attribute_enum('configuration_type', ConfigurationType)
        self.serialize_attribute_enum('option_type', OptionType)
        self.serialize_attribute_enum('resource_type', EntityName)

    @classmethod
    async def fetch(
        self,
        configuration_type: ConfigurationType,
        option_type: OptionType,
        resource_type: EntityName,
    ):
        if ConfigurationType.DBT == configuration_type:
            repo_path = get_repo_path(root_project=has_settings())

            if OptionType.PROJECTS == option_type or OptionType.PROFILES == option_type:
                project_full_paths = get_full_file_paths_containing_item(
                  repo_path,
                  lambda x: x.startswith('dbt_project.y'),
                )

                if OptionType.PROJECTS == option_type:

                    projects = await asyncio.gather(
                        *[read_file(full_path) for full_path in project_full_paths]
                    )

                    return [ConfigurationOption.load(
                        configuration_type=configuration_type,
                        option=project,
                        option_type=option_type,
                        resource_type=resource_type,
                        uuid=project.get('name'),
                    ) for project in projects]
                elif OptionType.PROFILES == option_type:
                    profile_full_paths_init = get_full_file_paths_containing_item(
                      repo_path,
                      lambda x: x.startswith('profiles.y'),
                    )

                    profile_full_paths = []
                    for full_path in profile_full_paths_init:
                        profile_full_paths.extend([(
                            full_path,
                            project_full_path,
                        ) for project_full_path in project_full_paths if os.path.dirname(
                            project_full_path,
                        ) in os.path.dirname(full_path)])

                    profiles = await asyncio.gather(
                        *[read_file(
                            full_path,
                        ) for full_path, project_full_path in profile_full_paths]
                    )

                    results = []
                    for idx, profile in enumerate(profiles):
                        full_path, project_full_path = profile_full_paths[idx]

                        option = []
                        for opts in profile.values():
                            option.extend(list((opts.get('outputs') or {}).keys()))

                        results.append(ConfigurationOption.load(
                            configuration_type=configuration_type,
                            metadata=dict(
                                full_path=str(
                                    Path(full_path).relative_to(repo_path),
                                ),
                                project_full_path=str(
                                    Path(project_full_path).relative_to(repo_path),
                                ),
                            ),
                            option=option,
                            option_type=option_type,
                            resource_type=resource_type,
                            uuid=list(profile.keys())[0] if profile else None,
                        ))

                    return results
