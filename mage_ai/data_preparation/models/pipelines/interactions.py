import os
from dataclasses import dataclass, field
from functools import reduce
from typing import Dict, List

import yaml

from mage_ai.api.utils import (
    has_at_least_admin_role,
    has_at_least_editor_role,
    has_at_least_viewer_role,
    is_owner,
)
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.models.pipelines.constants import (
    PIPELINE_INTERACTIONS_FILENAME,
)
from mage_ai.data_preparation.models.triggers import ScheduleInterval, ScheduleType
from mage_ai.orchestration.constants import Entity
from mage_ai.orchestration.db.models.oauth import Role, User
from mage_ai.presenters.interactions.constants import InteractionVariableType
from mage_ai.presenters.interactions.models import Interaction as InteractionBase
from mage_ai.presenters.interactions.models import InteractionLayoutItem
from mage_ai.shared.hash import merge_dict


@dataclass
class BlockInteractionTrigger:
    schedule_interval: ScheduleInterval = None
    schedule_type: ScheduleType = None

    def __post_init__(self):
        if self.schedule_interval and isinstance(self.schedule_interval, str):
            self.schedule_interval = ScheduleInterval(self.schedule_interval)

        if self.schedule_type and isinstance(self.schedule_type, str):
            self.schedule_type = ScheduleType(self.schedule_type)

    def to_dict(self) -> Dict:
        return dict(
            schedule_interval=self.schedule_interval.value if self.schedule_interval else None,
            schedule_type=self.schedule_type.value if self.schedule_type else None,
        )


@dataclass
class BlockInteractionVariable:
    disabled: bool = None
    required: bool = None
    types: List[InteractionVariableType] = None
    uuid_override: str = None

    def __post_init__(self):
        if self.types and isinstance(self.types, list):
            self.types = [InteractionVariableType(t) for t in self.types]

    def to_dict(self) -> Dict:
        return dict(
            disabled=self.disabled,
            required=self.required,
            types=[t.value for t in self.types],
            uuid_override=self.uuid_override,
        )


@dataclass
class InteractionPermission:
    roles: List[Role.DefaultRole] = None
    triggers: List[BlockInteractionTrigger] = None

    def __post_init__(self):
        if self.roles and isinstance(self.roles, list):
            self.roles = [Role.DefaultRole(i) for i in self.roles]

        if self.triggers and isinstance(self.triggers, list):
            self.triggers = [BlockInteractionTrigger(**i) for i in self.triggers]

    def to_dict(self) -> Dict:
        return dict(
            roles=[r.value for r in self.roles],
            triggers=[i.to_dict() for i in self.triggers],
        )


@dataclass
class BlockInteraction:
    # This is the path to the interaction file (excluding the interactions directory).
    uuid: str
    description: str = None
    layout: List[List[InteractionLayoutItem]] = field(default_factory=list)
    name: str = None
    permissions: List[InteractionPermission] = field(default_factory=list)
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

        if self.permissions and isinstance(self.permissions, list):
            arr = []
            for permission in self.permissions:
                if isinstance(permission, dict):
                    arr.append(InteractionPermission(**permission))
                else:
                    arr.append(permission)
            self.permissions = arr

        if self.variables and isinstance(self.variables, dict):
            mapping = {}
            for variable_uuid, variable in self.variables.items():
                if isinstance(variable, dict):
                    mapping[variable_uuid] = BlockInteractionVariable(**variable)
                else:
                    mapping[variable_uuid] = variable
            self.variables = mapping

    def to_dict(self) -> Dict:
        return dict(
            description=self.description,
            layout=[[i.to_dict() for i in arr] for arr in self.layout],
            name=self.name,
            permissions=[i.to_dict() for i in self.permissions],
            variables=reduce(lambda obj, tup: merge_dict(obj, {
                tup[0]: tup[1].to_dict(),
            }), (self.variables or {}).items(), {}),
            uuid=self.uuid,
        )


@dataclass
class PipelineInteractionLayoutItem(InteractionLayoutItem):
    block_uuid: str = None
    interaction: str = None

    def to_dict(self) -> Dict:
        return dict(
            block_uuid=self.block_uuid,
            interaction=self.interaction,
        )


@dataclass
class Interaction:
    blocks: Dict = field(default_factory=dict)
    layout: List[List[PipelineInteractionLayoutItem]] = field(default_factory=list)
    permissions: List[InteractionPermission] = field(default_factory=list)

    def __post_init__(self):
        if self.blocks and isinstance(self.blocks, dict):
            mapping = {}
            for block_uuid, interactions in self.blocks.items():
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
            self.blocks = mapping

        if self.layout and isinstance(self.layout, list):
            arr = []
            for row in self.layout:
                if isinstance(row, list):
                    arr2 = []
                    for item in row:
                        if isinstance(item, dict):
                            arr2.append(PipelineInteractionLayoutItem(**item))
                        else:
                            arr2.append(item)
                    arr.append(arr2)
                else:
                    arr.append(row)
            self.layout = arr

        if self.permissions and isinstance(self.permissions, list):
            arr = []
            for permission in self.permissions:
                if isinstance(permission, dict):
                    arr.append(InteractionPermission(**permission))
                else:
                    arr.append(permission)
            self.permissions = arr

    def to_dict(self) -> Dict:
        return dict(
            blocks=reduce(lambda obj, tup: merge_dict(obj, {
                tup[0]: [i.to_dict() for i in tup[1]],
            }), (self.blocks or {}).items(), {}),
            layout=[[i.to_dict() for i in arr] for arr in self.layout],
            permissions=[i.to_dict() for i in self.permissions],
        )


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

    async def add_interaction_to_block(self, block_uuid: str, interaction: InteractionBase) -> Dict:
        content_parsed = await self.to_dict() or {}

        blocks = content_parsed.get('blocks') or {}
        interactions = blocks.get(block_uuid) or []
        interactions.append(dict(uuid=interaction.uuid))
        blocks[block_uuid] = interactions

        await self.update(content_parsed=merge_dict(content_parsed, dict(
            blocks=blocks,
        )))

    async def filter_for_permissions(self, user: User = None) -> bool:
        interaction = await self.interaction()

        if not interaction or not interaction.permissions:
            return

        permissions = []

        for permission in interaction.permissions:
            for role in permission.roles:
                validate_func = None

                if Role.DefaultRole.ADMIN == role:
                    validate_func = has_at_least_admin_role
                elif Role.DefaultRole.EDITOR == role:
                    validate_func = has_at_least_editor_role
                elif Role.DefaultRole.OWNER == role:
                    validate_func = is_owner
                elif Role.DefaultRole.VIEWER == role:
                    validate_func = has_at_least_viewer_role

                if validate_func and validate_func(user, Entity.PIPELINE, self.pipeline.uuid):
                    permissions.append(permission)

        validation = permissions and len(permissions) >= 1
        if validation:
            self._interaction.permissions = permissions
        else:
            self._interaction = Interaction()

        return True if validation else False

    async def interaction_uuids(self) -> List[str]:
        interaction = await self.interaction()
        interaction_uuids = []

        if interaction:
            for _block_uuid, block_interactions in (interaction.blocks or {}).items():
                for block_interaction in block_interactions:
                    interaction_uuids.append(block_interaction.uuid)

        return list(set(interaction_uuids))

    async def save(self) -> None:
        await self.file.update_content_async(self._content or '')

    async def validate(
        self,
        content: str = None,
        content_parsed: Dict = None,
    ) -> None:
        settings = content_parsed or yaml.safe_load(content)
        Interaction(**settings)

    async def update(
        self,
        commit: bool = True,
        content: str = None,
        content_parsed: Dict = None,
    ) -> None:
        await self.validate(content=content, content_parsed=content_parsed)

        if content:
            self._content = content
        elif content_parsed:
            self._content = yaml.safe_dump(content_parsed)

        if not commit:
            return

        await self.save()

    async def variables(self) -> Dict:
        variables = {}

        interaction = await self.interaction()
        if not interaction:
            return variables

        for block_interactions in (interaction.blocks or {}).values():
            for block_interaction in block_interactions:
                interaction_base = InteractionBase(block_interaction.uuid)
                interaction_variables = await interaction_base.variables()
                variables.update(interaction_variables)

        return variables

    async def to_dict(self) -> Dict:
        interaction = await self.interaction()

        if not interaction:
            return {}

        return interaction.to_dict()
