from dataclasses import dataclass
from typing import Optional

from mage_ai.data.tabular.models import BatchSettings
from mage_ai.shared.models import BaseDataClass


@dataclass
class DynamicConfiguration(BaseDataClass):
    batch_settings: Optional[BatchSettings] = None
    dynamic: Optional[bool] = None
    reduce_output: Optional[bool] = None
    stream: Optional[bool] = None

    def __post_init__(self):
        self.serialize_attribute_class('batch_settings', BatchSettings)
