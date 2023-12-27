from dataclasses import dataclass
from typing import Dict, List, Union

from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.command_center.constants import (
    CommandCenterItemType,
    FileExtension,
    InteractionType,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.shared.models import BaseDataClass


@dataclass
class InteractionElement(BaseDataClass):
    class_name: str = None
    id: str = None


@dataclass
class Interaction(BaseDataClass):
    type: InteractionType
    element: InteractionElement = None
    options: Dict = None

    def __post_init__(self):
        self.serialize_attribute_class('element', InteractionElement)
        self.serialize_attribute_enum('type', InteractionType)


@dataclass
class Page(BaseDataClass):
    path: str
    external: bool = False
    openNewWindow: bool = False
    query: Dict = None


@dataclass
class Request(BaseDataClass):
    operation: OperationType
    resource: EntityName
    response_resource_key: str
    payload: Dict = None
    payload_resource_key: str = None
    query: Dict = None
    resource_id: Union[str, int] = None
    resource_parent: EntityName = None
    resource_parent_id: Union[str, int] = None

    def __post_init__(self):
        self.serialize_attribute_enum('operation', OperationType)
        self.serialize_attribute_enum('resource', EntityName)
        self.serialize_attribute_enum('resource_parent', EntityName)


@dataclass
class Action(BaseDataClass):
    delay: int = None
    interaction: Interaction = None
    page: Page = None
    request: Request = None

    def __post_init__(self):
        self.serialize_attribute_class('interaction', Interaction)
        self.serialize_attribute_class('page', Page)
        self.serialize_attribute_class('request', Request)


@dataclass
class BlockMetadata(BaseDataClass):
    type: BlockType

    def __post_init__(self):
        self.serialize_attribute_enum('type', BlockType)


@dataclass
class FileMetadata(BaseDataClass):
    extension: FileExtension

    def __post_init__(self):
        self.serialize_attribute_enum('extension', FileExtension)


@dataclass
class Metadata(BaseDataClass):
    block: BlockMetadata = None
    file: FileMetadata = None

    def __post_init__(self):
        self.serialize_attribute_class('block', BlockMetadata)
        self.serialize_attribute_class('file', FileMetadata)


@dataclass
class ItemBase(BaseDataClass):
    title: str
    type: CommandCenterItemType
    uuid: str
    actions: List[Action] = None
    description: str = None
    items: List[Dict] = None
    metadata: Metadata = None

    def __post_init__(self):
        self.serialize_attribute_class('metadata', Metadata)
        self.serialize_attribute_classes('actions', Action)
        self.serialize_attribute_enum('type', CommandCenterItemType)


@dataclass
class Item(ItemBase):
    title: str
    type: CommandCenterItemType
    uuid: str
    actions: List[Action] = None
    description: str = None
    items: List[ItemBase] = None
    metadata: Metadata = None

    def __post_init__(self):
        self.serialize_attribute_class('metadata', Metadata)
        self.serialize_attribute_classes('actions', Action)
        self.serialize_attribute_classes('items', Item)
        self.serialize_attribute_enum('type', CommandCenterItemType)
