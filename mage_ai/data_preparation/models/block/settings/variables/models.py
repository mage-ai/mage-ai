from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Union

from mage_ai.data.tabular.models import BatchSettings
from mage_ai.shared.models import BaseDataClass

ChunkKeyTypeBase = Union[bool, float, int, str]
ChunkKeyTypeDict = Dict[str, ChunkKeyTypeBase]
ChunkKeyTypeUnion = Union[ChunkKeyTypeDict, ChunkKeyTypeBase]


class InputType(str, Enum):
    # Batch settings will be used to fetch the data in batches,
    # and execute the decorated function inside a yield loop.
    BATCH = 'batch'
    # Original data will be passed as is.
    DEFAULT = 'default'
    # A generator to iterate over
    GENERATOR = 'generator'
    # Input variable will be a Callable function that loads the data; e.g. Variable object
    READER = 'reader'


@dataclass
class VariablSettings(BaseDataClass):
    batch_settings: Optional[BatchSettings] = None
    chunks: Optional[List[ChunkKeyTypeUnion]] = None
    input_type: Optional[InputType] = InputType.DEFAULT

    def __post_init__(self):
        self.serialize_attribute_class('batch_settings', BatchSettings)
        self.serialize_attribute_enum('input_type', InputType)


@dataclass
class VariableConfiguration(BaseDataClass):
    downstream: Optional[Dict[str, VariablSettings]] = None
    upstream: Optional[Dict[str, VariablSettings]] = None

    def __post_init__(self):
        self.downstream = {
            k: VariablSettings.load(**v) if isinstance(v, dict) else v
            for k, v in (self.downstream or {}).items()
        }
        self.upstream = {
            k: VariablSettings.load(**v) if isinstance(v, dict) else v
            for k, v in (self.upstream or {}).items()
        }

    def upstream_settings(self, block_uuid: str) -> VariablSettings:
        settings = self.upstream.get(block_uuid) if self.upstream else None
        return settings or VariablSettings()
