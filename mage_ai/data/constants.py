from typing import AsyncGenerator, Generator, Iterable, List, Union

import polars as pl

from mage_ai.data.models.generator import DataGenerator
from mage_ai.data.models.pyarrow.record_batch import RecordBatch, TaggedRecordBatch
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.shared.models import BaseEnum

SUPPORTED_VARIABLE_TYPES = [
    VariableType.DATAFRAME,
    VariableType.POLARS_DATAFRAME,
    VariableType.SERIES_PANDAS,
    VariableType.SERIES_POLARS,
]

ScanBatchDatasetResult = Union[RecordBatch, TaggedRecordBatch, pl.DataFrame]
OutputData = Union[
    DataGenerator,
    List[pl.DataFrame],
    Iterable[ScanBatchDatasetResult],
    List[ScanBatchDatasetResult],
]

RecordBatchGenerator = Union[Generator[ScanBatchDatasetResult, None, None], DataGenerator]

AsyncRecordBatchGenerator = AsyncGenerator[ScanBatchDatasetResult, None]


class InputDataType(BaseEnum):
    # Batch settings will be used to fetch the data in batches,
    # and execute the decorated function inside a yield loop.
    BATCH = 'batch'
    # @chunker, @chunking, @chunk
    # CHUNKS = 'chunks' # This will be handled in the block code
    # Original data will be passed as is.
    DEFAULT = 'default'
    # A generator to iterate over
    GENERATOR = 'generator'
    # Input variable will be a Callable function that loads the data; e.g. Variable object
    READER = 'reader'


class ReadModeType(BaseEnum):
    MEMORY = 'memory'
