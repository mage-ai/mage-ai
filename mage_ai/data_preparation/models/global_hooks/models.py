import os
from dataclasses import dataclass, field, make_dataclass
from enum import Enum
from typing import Dict, List, Tuple

import inflection
import yaml

from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.settings.repo import get_repo_path
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
    output_block_uuids: List[str] = field(default=None)
    pipeline_uuid: str = None
    stages: List[HookStage] = None
    strategies: List[HookStrategy] = None
    uuid: str = None

    def __post_init__(self):
        self.serialize_attribute_enums('conditions', HookCondition)
        self.serialize_attribute_class('strategies', HookStrategies)
        self.serialize_attribute_enums('stages', HookStage)


def __build_global_hook_resource_fields() -> List[Tuple]:
    arr = []

    for operation in OperationType:
        arr.append((
            operation.value,
            List[Hook],
            field(default=None),
        ))

    return arr


def __global_hook_resource_post_init(self):
    for operation in OperationType:
        self.serialize_attribute_classes(operation.value, Hook)


GlobalHookResource = make_dataclass(
    'GlobalHookResource',
    bases=(BaseDataClass,),
    fields=__build_global_hook_resource_fields(),
)


GlobalHookResource.__post_init__ = __global_hook_resource_post_init


def __build_global_hook_resources_fields() -> List[Tuple]:
    arr = []

    for entity_name in EntityName:
        arr.append((
            inflection.underscore(entity_name.value),
            GlobalHookResource,
            field(default=None),
        ))

    return arr


def __global_hook_resources_post_init(self):
    for entity_name in EntityName:
        self.serialize_attribute_class(inflection.underscore(entity_name.value), GlobalHookResource)


GlobalHookResources = make_dataclass(
    'GlobalHookResources',
    bases=(BaseDataClass,),
    fields=__build_global_hook_resources_fields(),
)


GlobalHookResources.__post_init__ = __global_hook_resources_post_init


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
        file_path_to_use = file_path or self.file_path()

        print('wtf', file_path_to_use, os.path.exists(file_path_to_use))
        if not os.path.exists(file_path_to_use):
            return None

        with open(file_path_to_use, 'r') as fp:
            content = fp.read()
            if content:
                yaml_config = yaml.safe_load(content) or {}
                print('omg', yaml_config)
                return self.load(**yaml_config)

    def save(self, file_path: str = None) -> None:
        with open(self.file_path(), 'w'):
            content = yaml.safe_dump(self.to_dict())
            safe_write(file_path or self.file_path(), content)

    def to_dict(self, **kwargs) -> Dict:
        return super().to_dict(ignore_empty=True)
