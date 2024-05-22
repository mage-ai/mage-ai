from dataclasses import dataclass
from typing import Dict, List, Optional, Union

from mage_ai.data.constants import InputDataType
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.shared.models import BaseDataClass

ChunkKeyTypeBase = Union[bool, float, int, str]
ChunkKeyTypeDict = Dict[str, ChunkKeyTypeBase]
ChunkKeyTypeUnion = Union[ChunkKeyTypeDict, ChunkKeyTypeBase]


@dataclass
class VariableSettings(BaseDataClass):
    batch_settings: Optional[BatchSettings] = None
    chunks: Optional[List[ChunkKeyTypeUnion]] = None
    input_data_types: Optional[List[InputDataType]] = None

    def __post_init__(self):
        self.serialize_attribute_class('batch_settings', BatchSettings)
        self.serialize_attribute_enums('input_data_types', InputDataType)


@dataclass
class VariableConfiguration(BaseDataClass):
    downstream: Optional[Dict[str, VariableSettings]] = None
    read: Optional[VariableSettings] = None
    upstream: Optional[Dict[str, VariableSettings]] = None
    write: Optional[VariableSettings] = None

    def __post_init__(self):
        self.serialize_attribute_class('read', VariableSettings)
        self.serialize_attribute_class('write', VariableSettings)
        self.downstream = {
            k: VariableSettings.load(**v) if isinstance(v, dict) else v
            for k, v in (self.downstream or {}).items()
        }
        self.upstream = {
            k: VariableSettings.load(**v) if isinstance(v, dict) else v
            for k, v in (self.upstream or {}).items()
        }

    def downstream_settings(self, block_uuid: str) -> VariableSettings:
        settings = self.downstream.get(block_uuid) if self.downstream else None
        return settings or VariableSettings()

    def upstream_settings(self, block_uuid: str) -> VariableSettings:
        settings = self.upstream.get(block_uuid) if self.upstream else None
        return settings or VariableSettings()
