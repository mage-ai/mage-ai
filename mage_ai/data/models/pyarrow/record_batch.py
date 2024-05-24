import math
from typing import Optional

import pyarrow as pa
import pyarrow.dataset as ds
from pandas.io.formats.style_render import Union

from mage_ai.data.models.generator import DataGenerator
from mage_ai.data.models.pyarrow.shared import Base
from mage_ai.data.models.pyarrow.table import Table
from mage_ai.data.tabular.constants import DEFAULT_BATCH_ITEMS_VALUE
from mage_ai.data.tabular.utils import DeserializedBatch


class Batch(Base):
    def __init__(self, target: Union[pa.RecordBatch, ds.TaggedRecordBatch], **kwargs):
        super().__init__(target, **kwargs)

    def generator(
        self, batch_size: Optional[int] = None, deserialize_on_consumption: Optional[bool] = False
    ):
        batch_size = batch_size or DEFAULT_BATCH_ITEMS_VALUE
        table = pa.Table.from_batches([self.record_batch])
        num_rows = table.num_rows

        def __load(
            index: int,
            batch_size=batch_size,
            deserialize_on_consumption=deserialize_on_consumption,
            object_metadata=self.object_metadata,
            table=table,
        ) -> Union[DeserializedBatch, pa.Table]:
            table_part = Table(
                table.slice(offset=index * batch_size, length=batch_size),
            )
            return table_part.deserialize() if deserialize_on_consumption else table_part

        def __measure(_index: int, batch_size=batch_size, num_rows=num_rows) -> int:
            return math.ceil(num_rows / batch_size)

        return DataGenerator(load_data=__load, measure_data=__measure)

    @property
    def record_batch(self) -> pa.RecordBatch:
        return self.target


class RecordBatch(Batch):
    pass


class TaggedRecordBatch(Batch):
    @property
    def record_batch(self) -> pa.RecordBatch:
        return self.target.record_batch
