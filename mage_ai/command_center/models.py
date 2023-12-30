from dataclasses import dataclass
from typing import Dict, List, Union

from mage_ai.api.operations.constants import OperationType
from mage_ai.command_center.constants import (
    ApplicationType,
    ButtonActionType,
    FileExtension,
    InteractionType,
    ItemType,
    ObjectType,
)
from mage_ai.command_center.settings import load_settings, save_settings
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.presenters.interactions.constants import InteractionInputType
from mage_ai.presenters.interactions.models import (
    InteractionInputOption,
    InteractionInputStyle,
)
from mage_ai.shared.hash import merge_dict
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
    resource: str
    response_resource_key: str
    payload: Dict = None
    query: Dict = None
    resource_id: Union[str, int] = None
    resource_parent: str = None
    resource_parent_id: Union[str, int] = None

    def __post_init__(self):
        self.serialize_attribute_enum('operation', OperationType)


@dataclass
class Action(BaseDataClass):
    delay: int = None
    interaction: Interaction = None
    page: Page = None
    request: Request = None
    upstream_action_value_key_mapping: Dict = None
    uuid: str = None

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
    action_timestamp: int = None
    block: BlockMetadata = None
    file: FileMetadata = None
    page: Dict = None

    def __post_init__(self):
        self.serialize_attribute_class('block', BlockMetadata)
        self.serialize_attribute_class('file', FileMetadata)


@dataclass
class FormInput(BaseDataClass):
    action_uuid: str = None
    description: str = None
    label: str = None
    icon_uuid: str = None
    monospace: bool = False
    name: str = None
    placeholder: str = None
    required: bool = False
    options: List[InteractionInputOption] = None
    style: InteractionInputStyle = None
    type: InteractionInputType = None

    def __post_init__(self):
        self.serialize_attribute_class('style', InteractionInputStyle)
        self.serialize_attribute_classes('options', InteractionInputOption)
        self.serialize_attribute_enum('type', InteractionInputType)


@dataclass
class Button(BaseDataClass):
    action_types: List[ButtonActionType]
    label: str
    color_uuid: str = None
    keyboard_shortcuts: List[List[int]] = None
    tooltip: str = None

    def __post_init__(self):
        self.serialize_attribute_enums('action_types', ButtonActionType)


@dataclass
class Application(BaseDataClass):
    application_type: ApplicationType
    buttons: List[Button] = None
    settings: List[Union[FormInput, Dict]] = None

    def __post_init__(self):
        self.serialize_attribute_classes('buttons', Button)
        self.serialize_attribute_enum('application_type', ApplicationType)

        if isinstance(self.settings, list):
            arr = []
            for settings in self.settings:
                if isinstance(settings, dict):
                    if ApplicationType.FORM == self.application_type:
                        arr.append(FormInput.load(**settings))

            self.settings = arr

    def to_dict(self, **kwargs) -> Dict:
        arr = []

        if isinstance(self.settings, list):
            for value in self.settings:
                if isinstance(value, dict):
                    arr.append(value)
                else:
                    arr.append(value.to_dict(**kwargs))

        return merge_dict(
            super().to_dict(**kwargs),
            dict(settings=arr),
        )


@dataclass
class IncludeExclude(BaseDataClass):
    excludes: List[str] = None
    includes: List[str] = None


@dataclass
class ModelSettings(BaseDataClass):
    directories: IncludeExclude = None
    projects: IncludeExclude = None

    def __post_init__(self):
        self.serialize_attribute_class('directories', IncludeExclude)
        self.serialize_attribute_class('projects', IncludeExclude)


@dataclass
class HistoryModelSettings(BaseDataClass):
    length: int = None


@dataclass
class HistorySettings(BaseDataClass):
    pages: HistoryModelSettings = None
    searches: HistoryModelSettings = None

    def __post_init__(self):
        self.serialize_attribute_class('pages', HistoryModelSettings)
        self.serialize_attribute_class('searches', HistoryModelSettings)


@dataclass
class KeyboardShortcutsSettings(BaseDataClass):
    main: List[List[int]] = None


@dataclass
class PositionSettings(BaseDataClass):
    height: int = None
    width: int = None
    x: int = None
    y: int = None


@dataclass
class InterfaceSettings(BaseDataClass):
    keyboard_shortcuts: KeyboardShortcutsSettings = None
    position: PositionSettings = None

    def __post_init__(self):
        self.serialize_attribute_class('keyboard_shortcuts', KeyboardShortcutsSettings)
        self.serialize_attribute_class('position', PositionSettings)


@dataclass
class CacheSettings(BaseDataClass):
    blocks: ModelSettings = None
    files: ModelSettings = None
    pipelines: ModelSettings = None
    triggers: ModelSettings = None

    def __post_init__(self):
        self.serialize_attribute_class('blocks', ModelSettings)
        self.serialize_attribute_class('files', ModelSettings)
        self.serialize_attribute_class('pipelines', ModelSettings)
        self.serialize_attribute_class('triggers', ModelSettings)


@dataclass
class CommandCenterSettings(BaseDataClass):
    cache: CacheSettings = None
    history: HistorySettings = None
    interface: InterfaceSettings = None

    def __post_init__(self):
        self.serialize_attribute_class('cache', CacheSettings)
        self.serialize_attribute_class('history', HistorySettings)
        self.serialize_attribute_class('interface', InterfaceSettings)

    @classmethod
    def load_from_file_path(self, file_path: str = None) -> 'CommandCenterSettings':
        return self.load(**(load_settings() or {}))

    def save(self, file_path: str = None):
        save_settings(self.to_dict(), file_path=file_path)


@dataclass
class ItemBase(BaseDataClass):
    item_type: ItemType
    object_type: ObjectType
    title: str
    uuid: str
    actions: List[Action] = None
    application: Application = None
    color_uuid: str = None
    description: str = None
    icon_uuid: str = None
    items: List[Dict] = None
    metadata: Metadata = None
    score: int = 0

    def __post_init__(self):
        self.serialize_attribute_class('application', Application)
        self.serialize_attribute_class('metadata', Metadata)
        self.serialize_attribute_classes('actions', Action)
        self.serialize_attribute_enum('item_type', ItemType)
        self.serialize_attribute_enum('object_type', ObjectType)


@dataclass
class Item(ItemBase):
    item_type: ItemType
    object_type: ObjectType
    title: str
    uuid: str
    actions: List[Action] = None
    application: Application = None
    color_uuid: str = None
    description: str = None
    icon_uuid: str = None
    items: List[ItemBase] = None
    metadata: Metadata = None
    score: int = 0

    def __post_init__(self):
        super().__post_init__()
        self.serialize_attribute_classes('items', Item)
