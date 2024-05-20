from typing import Any, Dict, Optional, Union

import pandas as pd
import polars as pl
import pyarrow as pa
import pyarrow.dataset as ds

from mage_ai.data.tabular.constants import COLUMN_CHUNK


def deserialize_batch(
    batch: Union[pa.RecordBatch, ds.TaggedRecordBatch],
    object_metadata: Optional[Dict[str, str]] = None,
) -> Union[
    pd.Series,
    pl.DataFrame,
    pl.Series,
]:
    record_batch = batch if isinstance(batch, pa.RecordBatch) else batch.record_batch
    table = pa.Table.from_batches([record_batch])
    if COLUMN_CHUNK in table.column_names:
        table = table.drop(columns=[COLUMN_CHUNK])

    if object_metadata is not None and table.num_columns >= 1:
        if compare_object(pd.Series, object_metadata):
            column_name = table.column_names[0]
            return pd.Series(table.column(column_name).to_pandas())
        elif compare_object(pl.Series, object_metadata):
            # Convert the PyArrow Array/ChunkedArray directly to a Polars Series
            column = table.column(0)
            if column.num_chunks > 0:
                # Handle the case where the column is chunked
                chunk_array = column.chunk(0)  # Assuming you want the first chunk
                # Create a Polars Series from the PyArrow Array
                return pl.Series(chunk_array.to_pylist())
            else:
                # Handle non-chunked column
                return pl.Series(column.to_pylist())

    return pl.from_arrow(table)


def compare_object(object: Any, object_metadata: Dict[str, str]) -> bool:
    return (
        object_metadata.get('module') == object.__module__
        and object_metadata.get('name') == object.__name__
    )
