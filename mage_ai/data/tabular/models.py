from dataclasses import dataclass, field
from functools import reduce
from math import ceil
from typing import Any, Dict, List, Optional

from mage_ai.data.tabular.constants import (
    DEFAULT_BATCH_BYTE_VALUE,
    DEFAULT_BATCH_COUNT_VALUE,
    DEFAULT_BATCH_ITEMS_VALUE,
    BatchStrategy,
)
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

    @property
    def strategy(self) -> BatchStrategy:
        if self.count is not None:
            return BatchStrategy.COUNT
        elif self.items is not None:
            return BatchStrategy.ITEMS
        elif self.size is not None:
            return BatchStrategy.BYTES
        else:
            return BatchStrategy.ITEMS

    @property
    def batch_value(self) -> int:
        if BatchStrategy.ITEMS == self.strategy and self.items is not None:
            return self.items.maximum or DEFAULT_BATCH_ITEMS_VALUE
        elif BatchStrategy.BYTES == self.strategy and self.size is not None:
            return self.size.maximum or DEFAULT_BATCH_BYTE_VALUE
        elif BatchStrategy.COUNT == self.strategy and self.count is not None:
            return self.count.maximum or DEFAULT_BATCH_COUNT_VALUE
        else:
            return DEFAULT_BATCH_ITEMS_VALUE

    def batch_size(self, metadatas: List[Dict[str, Any]]) -> int:
        total_row_count, total_byte_size = reduce(
            lambda acc, metadata: (
                acc[0] + metadata['num_rows'],
                acc[1] + metadata['total_byte_size'],
            ),
            metadatas,
            (0, 0),
        )
        if BatchStrategy.ITEMS == self.strategy:
            batch_size = self.batch_value or DEFAULT_BATCH_ITEMS_VALUE
        elif BatchStrategy.BYTES == self.strategy:
            batch_value = self.batch_value or DEFAULT_BATCH_BYTE_VALUE
            estimated_bytes_per_row = total_byte_size / total_row_count
            batch_size = max(1, int(batch_value / estimated_bytes_per_row))
        elif BatchStrategy.COUNT == self.strategy:
            batch_value = self.batch_value or DEFAULT_BATCH_COUNT_VALUE
            batch_size = ceil(total_row_count / batch_value)
        else:
            batch_size = DEFAULT_BATCH_ITEMS_VALUE

        return batch_size
