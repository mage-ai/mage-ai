import os
from dataclasses import dataclass, field, make_dataclass
from enum import Enum
from typing import Dict, List, Tuple

import yaml

from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find, find_index
from mage_ai.shared.hash import ignore_keys, merge_dict
from mage_ai.shared.io import safe_write
from mage_ai.shared.models import BaseDataClass


class HookCondition(str, Enum):
    FAILURE = 'failure'
    SUCCESS = 'success'


class HookStrategy(str, Enum):
    BREAK = 'break'
    CONTINUE = 'continue'
    RAISE = 'raise'


class HookStage(str, Enum):
    AFTER = 'after'
    BEFORE = 'before'
    DURING = 'during'


@dataclass
class HookStrategies(BaseDataClass):
    failure: List[HookStrategy] = field(default=None)
    success: List[HookStrategy] = field(default=None)

    def __post_init__(self):
        self.serialize_attribute_enums('failure', HookStrategy)
        self.serialize_attribute_enums('success', HookStrategy)


@dataclass
class Hook(BaseDataClass):
    conditions: List[HookCondition] = None
    operation_type: OperationType = None
    output_block_uuids: List[str] = field(default=None)
    pipeline_uuid: str = None
    resource_type: EntityName = None
    stages: List[HookStage] = None
    strategies: List[HookStrategy] = None
    uuid: str = None

    def __post_init__(self):
        self.serialize_attribute_class('strategies', HookStrategies)
        self.serialize_attribute_enum('operation_type', OperationType)
        self.serialize_attribute_enum('resource_type', EntityName)
        self.serialize_attribute_enums('conditions', HookCondition)
        self.serialize_attribute_enums('stages', HookStage)

    def to_dict(self, include_all: bool = False, **kwargs):
        data = super().to_dict(**kwargs)
        if include_all:
            return data

        return ignore_keys(data, [
            'operation_type',
            'resource_type',
        ])


def __build_global_hook_resource_fields() -> List[Tuple]:
    arr = []

    for operation in OperationType:
        arr.append((
            operation.value,
            List[Hook],
            field(default=None),
        ))

    return arr


GlobalHookResourceBase = make_dataclass(
    'GlobalHookResourceBase',
    bases=(BaseDataClass,),
    fields=__build_global_hook_resource_fields(),
)


@dataclass
class GlobalHookResource(GlobalHookResourceBase):
    resource_type = EntityName = None

    def __post_init__(self):
        self.serialize_attribute_enum('resource_type', EntityName)

        for operation in OperationType:
            self.serialize_attribute_classes(
                operation.value,
                Hook,
                operation_type=operation,
                resource_type=self.resource_type,
            )


def __build_global_hook_resources_fields() -> List[Tuple]:
    arr = []

    for entity_name in EntityName:
        arr.append((
            entity_name.value,
            GlobalHookResource,
            field(default=None),
        ))

    return arr


GlobalHookResourcesBase = make_dataclass(
    'GlobalHookResourcesBase',
    bases=(BaseDataClass,),
    fields=__build_global_hook_resources_fields(),
)


@dataclass
class GlobalHookResources(GlobalHookResourcesBase):
    disable_attribute_snake_case = True

    def __post_init__(self):
        for entity_name in EntityName:
            self.serialize_attribute_class(
                entity_name.value,
                GlobalHookResource,
                resource_type=entity_name,
            )


@dataclass
class GlobalHooks(BaseDataClass):
    resources: GlobalHookResources = None

    def __post_init__(self):
        self.serialize_attribute_class('resources', GlobalHookResources)

    @classmethod
    def file_path(self) -> str:
        return os.path.join(get_repo_path(), 'global_hooks.yaml')

    @classmethod
    def load_from_file(self, file_path: str = None) -> 'GlobalHooks':
        yaml_config = {}

        file_path_to_use = file_path or self.file_path()
        if os.path.exists(file_path_to_use):
            with open(file_path_to_use, 'r') as fp:
                content = fp.read()
                if content:
                    yaml_config = yaml.safe_load(content) or {}

        return self.load(**yaml_config)

    def add_hook(self, hook: Hook, payload: Dict = None, update: bool = False) -> Hook:
        if not update and self.get_hook(
            operation_type=hook.operation_type,
            resource_type=hook.resource_type,
            uuid=hook.uuid,
        ):
            raise Exception(
                f'Hook {hook.uuid} already exist for resource '
                f'{hook.resource_type} and operation {hook.operation_type}.',
            )

        if not self.resources:
            self.resources = GlobalHookResources.load()

        resource = getattr(self.resources, hook.resource_type.value)
        if not resource:
            resource = GlobalHookResource.load()

        hooks = getattr(resource, hook.operation_type)
        if not hooks:
            hooks = []

        if update:
            index = find_index(
                lambda x: (
                    x.uuid == hook.uuid and
                    x.operation_type == hook.operation_type and
                    x.resource_type == hook.resource_type
                ),
                hooks,
            )
            if index >= 0:
                hook_updated = Hook.load(**merge_dict(hook.to_dict(include_all=True), payload))
                if hook.resource_type == hook_updated.resource_type and \
                        hook.operation_type == hook_updated.operation_type:

                    hooks[index] = hook_updated
                else:
                    # Move the hook
                    self.add_hook(hook_updated)
                    self.remove_hook(hook)
            else:
                raise Exception(
                    f'Hook {hook.uuid} doesn’t exist for resource '
                    f'{hook.resource_type} and operation {hook.operation_type}.',
                )
        else:
            hooks.append(hook)
            setattr(resource, hook.operation_type.value, hooks)
            setattr(self.resources, hook.resource_type.value, resource)

    def remove_hook(self, hook: Hook) -> Hook:
        if self.resources:
            resource = getattr(self.resources, hook.resource_type.value)
            if resource:
                hooks = getattr(resource, hook.operation_type.value)
                if hooks:
                    arr = []
                    for x in hooks:
                        val = x.uuid != hook.uuid or \
                            x.operation_type != hook.operation_type or \
                            x.resource_type != hook.resource_type
                        if val:
                            arr.append(x)

                    setattr(resource, hook.operation_type.value, arr)
                    setattr(self.resources, hook.resource_type.value, resource)

    def hooks(self) -> List[Hook]:
        arr = []
        if self.resources:
            for entity_name in EntityName:
                resource = getattr(self.resources, entity_name.value)
                if resource:
                    resource.resource_type = entity_name
                    for operation in OperationType:
                        hooks = getattr(resource, operation.value)
                        if hooks:
                            for hook in hooks:
                                hook.operation_type = operation
                                hook.resource_type = entity_name
                                arr.append(hook)
        return arr

    def get_hook(self, resource_type: EntityName, operation_type: OperationType, uuid: str) -> Hook:
        return find(
            lambda x: (
                x.uuid == uuid and
                x.operation_type == operation_type and
                x.resource_type == resource_type
            ),
            self.hooks(),
        )

    def save(self, file_path: str = None) -> None:
        with open(self.file_path(), 'w'):
            content = yaml.safe_dump(self.to_dict())
            safe_write(file_path or self.file_path(), content)

    def to_dict(self, **kwargs) -> Dict:
        return super().to_dict(convert_enum=True, ignore_empty=True)
