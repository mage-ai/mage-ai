from dataclasses import dataclass, field
from functools import reduce
from math import ceil
from typing import Any, Dict, List, Optional, Union

from mage_ai.data.constants import ReadModeType
from mage_ai.data.tabular.constants import (
    DEFAULT_BATCH_BYTE_VALUE,
    DEFAULT_BATCH_COUNT_VALUE,
    DEFAULT_BATCH_ITEMS_VALUE,
    BatchStrategy,
)
from mage_ai.io.base import ExportWritePolicy
from mage_ai.shared.models import BaseDataClass


@dataclass
class Settings(BaseDataClass):
    maximum: int = 0
    minimum: int = 0


@dataclass
class BatchSettings(BaseDataClass):
    """
    Batches with less items uses less memory
        Batch by 10K rows:
            Time elapsed: 64.632 ms
            Memory start: 0.192 gb
            Memory final: 0.795 gb
            Memory churn: 16.318 gb
            Memory peak : 13.953 gb
        Batch by 100K rows:
            Time elapsed: 64.961 ms
            Memory start: 0.194 gb
            Memory final: 1.362 gb
            Memory churn: 17.684 gb
            Memory peak : 14.831 gb
        Batch by 1M rows:
            Time elapsed: 72.813 ms
            Memory start: 0.198 gb
            Memory final: 0.935 gb
            Memory churn: 18.075 gb
            Memory peak : 14.756 gb

    Batches with less bytes uses less memory
        Batch by 100MB:
            Time elapsed: 73.180 ms
            Memory start: 0.874 gb
            Memory final: 1.028 gb
            Memory churn: 16.988 gb
            Memory peak : 14.823 gb
        Batch by 1GB:
            Time elapsed: 63.710 ms
            Memory start: 0.890 gb
            Memory final: 0.948 gb
            Memory churn: 17.181 gb
            Memory peak : 14.559 gb
        Batch by 2GB:
            Time elapsed: 67.282 ms
            Memory start: 0.755 gb
            Memory final: 1.059 gb
            Memory churn: 17.256 gb
            Memory peak : 15.057 gb
    """

    count: Settings = field(default_factory=Settings)
    items: Settings = field(default_factory=Settings)
    mode: Optional[Union[ReadModeType, ExportWritePolicy]] = None
    size: Settings = field(default_factory=Settings)

    def __post_init__(self):
        self.serialize_attribute_class('count', Settings)
        self.serialize_attribute_class('items', Settings)
        self.serialize_attribute_class('size', Settings)

        if self.mode:
            for mode in (ReadModeType, ExportWritePolicy):
                if mode.has_value(self.mode):
                    self.mode = mode.from_value(self.mode)
                    break

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
