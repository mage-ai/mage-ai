import os
from dataclasses import asdict, dataclass, field
from typing import Dict, List

import yaml

from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.pipelines.constants import (
    PIPELINE_INTERACTIONS_FILENAME,
)
from mage_ai.data_preparation.models.triggers import ScheduleType
from mage_ai.presenters.interactions.constants import InteractionVariableType
from mage_ai.presenters.interactions.models import InteractionLayoutItem


@dataclass
class BlockInteractionTrigger:
    schedule_interval: str = None
    schedule_type: ScheduleType = None

    def __post_init__(self):
        if self.schedule_type and isinstance(self.schedule_type, str):
            self.schedule_type = ScheduleType(self.schedule_type)


@dataclass
class BlockInteractionVariable:
    disabled: bool = None
    required: bool = None
    types: List[InteractionVariableType] = None
    uuid_override: str = None

    def __post_init__(self):
        if self.types and isinstance(self.types, list):
            self.types = [InteractionVariableType(t) for t in self.types]


@dataclass
class BlockInteraction:
    name: str
    # This is the path to the interaction file (excluding the interactions directory).
    uuid: str
    layout: List[List[InteractionLayoutItem]] = field(default_factory=list)
    roles: List[str] = None
    triggers: List[BlockInteractionTrigger] = None
    variables: Dict = field(default_factory=dict)

    def __post_init__(self):
        if self.layout and isinstance(self.layout, list):
            arr = []
            for row in self.layout:
                if isinstance(row, list):
                    arr2 = []
                    for item in row:
                        if isinstance(item, dict):
                            arr2.append(InteractionLayoutItem(**item))
                        else:
                            arr2.append(item)
                    arr.append(arr2)
                else:
                    arr.append(row)
            self.layout = arr

        if self.triggers and isinstance(self.triggers, list):
            arr = []
            for trigger in self.triggers:
                if isinstance(trigger, dict):
                    arr.append(BlockInteractionTrigger(**trigger))
                else:
                    arr.append(trigger)
            self.triggers = arr

        if self.variables and isinstance(self.variables, dict):
            mapping = {}
            for variable_uuid, variable in self.variables.items():
                if isinstance(variable, dict):
                    mapping[variable_uuid] = BlockInteractionVariable(**variable)
                else:
                    mapping[variable_uuid] = variable
            self.variables = mapping


@dataclass
class Interaction:
    interactions: Dict = field(default_factory=dict)

    def __post_init__(self):
        if self.interactions and isinstance(self.interactions, dict):
            mapping = {}
            for block_uuid, interactions in self.interactions.items():
                if isinstance(interactions, list):
                    arr = []
                    for interaction in interactions:
                        if isinstance(interaction, dict):
                            arr.append(BlockInteraction(**interaction))
                        else:
                            arr.append(interaction)
                    mapping[block_uuid] = arr
                else:
                    mapping[block_uuid] = interactions
            self.interactions = mapping


class PipelineInteractions:
    def __init__(self, pipeline):
        self.pipeline = pipeline

        self._content = None
        self._interaction = None

    async def content_async(self) -> str:
        if self._content is None:
            self._content = await self.file.content_async()
        return self._content

    async def interaction(self) -> Dict:
        if self._interaction is not None or not self.exists():
            return self._interaction

        content = await self.content_async()
        if content:
            settings = yaml.safe_load(content)
            if settings:
                self._interaction = Interaction(**settings)

        return self._interaction

    def exists(self) -> bool:
        return self.file.exists()

    @property
    def file(self) -> File:
        return File.from_path(self.file_path)

    @property
    def file_path(self) -> str:
        return os.path.join(self.pipeline.dir_path, PIPELINE_INTERACTIONS_FILENAME)

    async def save(self) -> None:
        await self.file.update_content_async(self._content or '')

    async def update(
        self,
        commit: bool = True,
        content: str = None,
        content_parsed: Dict = None,
    ) -> None:
        if content:
            self._content = content
        elif content_parsed:
            self._content = yaml.safe_dump(content_parsed)

        if commit:
            await self.save()

    async def to_dict(self) -> Dict:
        interaction = await self.interaction()

        return asdict(interaction)
