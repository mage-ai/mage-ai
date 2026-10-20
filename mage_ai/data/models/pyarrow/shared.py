from typing import Dict, Optional, Union

import pyarrow as pa
import pyarrow.dataset as ds

from mage_ai.data.tabular.utils import DeserializedBatch, deserialize_batch
from mage_ai.shared.models import Delegator


class Base(Delegator):
    def __init__(
        self,
        target: Union[pa.RecordBatch, ds.TaggedRecordBatch, pa.Table],
        object_metadata: Optional[Dict[str, str]] = None,
    ):
        self.target = target
        self.delegate = Delegator(self.target)
        self.object_metadata = object_metadata

    def deserialize(self) -> DeserializedBatch:
        return deserialize_batch(self.target, object_metadata=self.object_metadata)
