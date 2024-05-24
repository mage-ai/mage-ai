from typing import Any, Dict, List, Optional, Union

import pandas as pd
import polars as pl
import pyarrow as pa
import pyarrow.dataset as ds

from mage_ai.data.tabular.constants import COLUMN_CHUNK
from mage_ai.shared.parsers import object_to_dict

DeserializedBatch = Union[
    pd.DataFrame,
    pd.Series,
    pl.DataFrame,
    pl.Series,
]


def convert_series_list_to_dataframe(series_list: List[pl.Series]) -> pl.DataFrame:
    """
    Converts a list of Polars Series into a Polars DataFrame by treating each Series as a column.
    """
    # Concatenate Series as columns to form a DataFrame
    df = pl.DataFrame({s.name or f'series_{i}': s for i, s in enumerate(series_list)})
    return df


def series_to_dataframe(series: Union[pd.Series, pl.Series]) -> pl.DataFrame:
    if isinstance(series, pd.Series):
        series = pl.Series(series.name, series.to_numpy())
    return pl.DataFrame(series)


def deserialize_batch(
    batch: Union[pa.RecordBatch, ds.TaggedRecordBatch, pa.Table],
    object_metadata: Optional[Dict[str, str]] = None,
) -> DeserializedBatch:
    if isinstance(batch, pa.Table):
        table = batch
    else:
        record_batch = batch if isinstance(batch, pa.RecordBatch) else batch.record_batch
        table = pa.Table.from_batches([record_batch])

    if COLUMN_CHUNK in table.column_names:
        table = table.drop([COLUMN_CHUNK])

    if object_metadata is not None and table.num_columns >= 1:
        if compare_object(pd.DataFrame, object_metadata):
            return table.to_pandas()
        elif compare_object(pd.Series, object_metadata):
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


def multi_series_to_frame(
    df: Optional[Union[pd.DataFrame, pl.DataFrame, pl.Series, pd.Series]] = None,
    dfs: Optional[Union[List[pd.DataFrame], List[pl.DataFrame], pl.Series, pd.Series]] = None,
):
    object_metadata = (
        object_to_dict(df, include_hash=False, include_uuid=False) if df is not None else None
    )

    series_sample = None
    if dfs is not None:
        if object_metadata is None:
            object_metadata = object_to_dict(dfs[0], include_hash=False, include_uuid=False)
        if all([isinstance(item, (pd.Series, pl.Series)) for item in dfs]):
            series_sample = dfs[0]
            dfs = [
                series_to_dataframe(item)
                for item in dfs
                if isinstance(item, (pd.Series, pl.Series))
            ]
        elif all([isinstance(item, pd.DataFrame) for item in dfs]):
            dfs = [pl.from_pandas(item) for item in dfs if isinstance(item, pd.DataFrame)]
    elif isinstance(df, (pd.Series, pl.Series)):
        series_sample = df
        df = series_to_dataframe(df)
    elif isinstance(df, pd.DataFrame):
        df = pl.from_pandas(df)

    return df, dfs, series_sample, object_metadata
