from typing import Dict, Optional

import pyarrow as pa
import pyarrow.dataset as ds

from mage_ai.data.tabular.utils import deserialize_batch
from mage_ai.shared.models import Delegator


class RecordBatch(Delegator):
    def __init__(
        self,
        target: pa.RecordBatch,
        object_metadata: Optional[Dict[str, str]] = None,
    ):
        self.target = target
        self.delegate = Delegator(self.target)
        self.object_metadata = object_metadata

    def deserialize(self):
        return deserialize_batch(self.target, object_metadata=self.object_metadata)


class TaggedRecordBatch(Delegator):
    def __init__(
        self,
        target: ds.TaggedRecordBatch,
        object_metadata: Optional[Dict[str, str]] = None,
    ):
        self.target = target
        self.delegate = Delegator(self.target)
        self.object_metadata = object_metadata

    def deserialize(self):
        return deserialize_batch(self.target, object_metadata=self.object_metadata)
