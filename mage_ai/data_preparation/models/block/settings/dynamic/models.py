from dataclasses import dataclass
from typing import List, Optional, Union

from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data_preparation.models.block.settings.dynamic.constants import ModeType
from mage_ai.shared.models import BaseDataClass


@dataclass
class ModeSettings(BaseDataClass):
    type: ModeType
    poll_interval: Optional[int] = None

    def __post_init__(self):
        self.serialize_attribute_enums('type', ModeType)


@dataclass
class DynamicConfiguration(BaseDataClass):
    batch_settings: Optional[BatchSettings] = None
    modes: Optional[List[ModeSettings]] = None
    # Enable for all downstream or choose specific downstream blocks
    parent: Optional[Union[List[str], bool]] = None
    # Enable for all downstream or choose specific downstream blocks
    reduce_output: Optional[Union[List[str], bool]] = None
    # As a dynamic child, choose which upstream blocks to reduce their output
    reduce_output_upstream: Optional[List[str]] = None

    def __post_init__(self):
        self.serialize_attribute_class('batch_settings', BatchSettings)
        self.serialize_attribute_classes('modes', ModeSettings)
