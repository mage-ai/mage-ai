from dataclasses import dataclass, field
from typing import Optional

from mage_ai.shared.models import BaseDataClass


@dataclass
class Settings(BaseDataClass):
    maximum: Optional[int] = field(default=None)
    minimum: Optional[int] = field(default=None)


@dataclass
class BatchSettings(BaseDataClass):
    count: Optional[Settings] = field(default=None)
    items: Optional[Settings] = field(default=None)
    size: Optional[Settings] = field(default=None)

    def __post_init__(self):
        self.serialize_attribute_class('count', Settings)
        self.serialize_attribute_class('items', Settings)
        self.serialize_attribute_class('size', Settings)
