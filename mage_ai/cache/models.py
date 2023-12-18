from dataclasses import dataclass
from typing import Dict

from mage_ai.cache.constants import CacheItemType
from mage_ai.shared.models import BaseDataClass


@dataclass
class CacheItem(BaseDataClass):
    item: Dict = None
    item_type: CacheItemType = None
    uuid: str = None

    def __post_init__(self):
        self.serialize_attribute_enums('item_type', CacheItemType)
