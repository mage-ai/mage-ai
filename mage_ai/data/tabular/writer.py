import asyncio
import glob
import json
from typing import Dict, List, Optional, Union

import pandas as pd
import polars as pl
import pyarrow as pa
from pyarrow import parquet as pq

from mage_ai.data.tabular.constants import COLUMN_CHUNK
from mage_ai.data.tabular.models import DEFAULT_BATCH_ITEMS_VALUE, BatchSettings
from mage_ai.data.tabular.utils import multi_series_to_frame
from mage_ai.shared.environments import is_debug


def append_chunk_column(
    df: pl.DataFrame,
    chunk_size: Optional[int] = None,
    total_rows: Optional[int] = None,
    use_index_as_chunk: Optional[bool] = False,
    index: int = 0,
) -> pl.DataFrame:
    if total_rows is None:
        total_rows = df.height

    if use_index_as_chunk:
        chunks = [index] * total_rows
    elif chunk_size is not None:
        chunks = [i // chunk_size for i in range(total_rows)]
    else:
        chunks = [
            0
        ] * total_rows  # Default to all rows in the same chunk if no parameters are provided

    return df.with_columns([pl.Series(COLUMN_CHUNK, chunks).cast(pl.Int32)])


def add_chunk_column(
    df: pl.DataFrame,
    chunk_size: Optional[int] = None,
    num_buckets: Optional[int] = None,
    use_index_as_chunk: Optional[bool] = False,
    index: int = 0,
) -> pl.DataFrame:
    """
    Adds a 'chunk' column to the DataFrame based on the specified number
    of buckets or chunk size or uses index as chunk number when asked.
    :param df: Input Polars DataFrame.
    :param num_buckets: The desired number of chunks (buckets).
    :param chunk_size: The number of rows each chunk should contain.
    :param use_index_as_chunk: Use index as the chunk number.
    :param index: Index number when using index as the chunk number.
    :return: DataFrame with an added 'chunk' column.
    """
    total_rows = df.height

    if num_buckets is not None:
        # Calculate chunk size based on the total number of rows and the desired number of buckets
        chunk_size = max(total_rows // num_buckets, 1)
        num_buckets = (total_rows + chunk_size - 1) // chunk_size

    if is_debug():
        print(f'Chunk size: {chunk_size}, Total rows: {total_rows}, Num buckets: {num_buckets}')

    return append_chunk_column(df, chunk_size, total_rows, use_index_as_chunk, index)


def add_custom_metadata_to_table(table: pa.Table, metadata: Dict) -> pa.Table:
    # This is a placeholder function. Adapt it based on your actual metadata handling.
    # Access existing metadata (if any) and merge with custom metadata
    existing_metadata = table.schema.metadata if table.schema.metadata is not None else {}
    updated_metadata = {
        **existing_metadata,
        **{key.encode(): str(value).encode() for key, value in metadata.items()},
    }

    # Update PyArrow Table schema with merged metadata
    new_schema = table.schema.with_metadata(updated_metadata)
    return table.replace_schema_metadata(new_schema.metadata)


def to_parquet_sync(
    output_dir: str,
    df: Optional[Union[pl.DataFrame, pl.Series, pd.Series]] = None,
    dfs: Optional[Union[List[pl.DataFrame], pl.Series, pd.Series]] = None,
    basename_template: Optional[str] = None,
    existing_data_behavior: Optional[str] = None,
    metadata: Optional[Dict] = None,
    partition_cols: Optional[List[str]] = None,
    settings: Optional[BatchSettings] = None,
) -> Dict[str, int]:
    total_rows = 0
    total_columns = 0

    for table, partition_columns in __prepare_data(
        output_dir=output_dir,
        df=df,
        dfs=dfs,
        metadata=metadata,
        partition_cols=partition_cols,
        settings=settings,
    ):
        pq.write_to_dataset(
            table,
            basename_template=basename_template,
            compression='snappy',
            existing_data_behavior=existing_data_behavior,
            partition_cols=partition_columns,
            root_path=output_dir,
            use_dictionary=True,
        )
        total_rows += table.num_rows
        total_columns = max(len(table.schema.names), total_columns)

    return dict(
        columns=total_columns,
        rows=total_rows,
    )


async def to_parquet_async(
    output_dir: str,
    df: Optional[Union[pl.DataFrame, pl.Series, pd.Series]] = None,
    dfs: Optional[Union[List[pl.DataFrame], pl.Series, pd.Series]] = None,
    basename_template: Optional[str] = None,
    existing_data_behavior: Optional[str] = None,
    metadata: Optional[Dict] = None,
    partition_cols: Optional[List[str]] = None,
    settings: Optional[BatchSettings] = None,
) -> Dict[str, int]:
    total_rows = 0
    total_columns = 0

    for table, partition_columns in __prepare_data(
        output_dir=output_dir,
        df=df,
        dfs=dfs,
        metadata=metadata,
        partition_cols=partition_cols,
        settings=settings,
    ):
        await __write_to_dataset_async(
            table,
            root_path=output_dir,
            existing_data_behavior=existing_data_behavior,
            partition_cols=partition_columns,
        )
        total_rows += table.num_rows
        total_columns = max(len(table.schema.names), total_columns)

    return dict(
        columns=total_columns,
        rows=total_rows,
    )


async def __write_to_dataset_async(
    table: pa.Table,
    root_path: str,
    basename_template: Optional[str] = None,
    existing_data_behavior: Optional[str] = None,
    partition_cols: Optional[List[str]] = None,
):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        pq.write_to_dataset,
        table,
        basename_template=basename_template,
        compression='snappy',
        existing_data_behavior=existing_data_behavior,
        partition_cols=partition_cols,
        root_path=root_path,
        use_dictionary=True,
    )


def __prepare_data(
    output_dir: str,
    df: Optional[Union[pd.DataFrame, pl.DataFrame, pl.Series, pd.Series]] = None,
    dfs: Optional[Union[List[pd.DataFrame], List[pl.DataFrame], pl.Series, pd.Series]] = None,
    metadata: Optional[Dict] = None,
    partition_cols: Optional[List[str]] = None,
    settings: Optional[BatchSettings] = None,
):
    """
    Writes a Polars DataFrame to partitioned Parquet files directly using PyArrow,
    while adding custom metadata and managing partitioning automatically.
    :param df: Polars DataFrame to write.
    :param output_dir: Base directory for writing partitioned Parquet files.
    :param partition_cols: List of column names on which to partition the data.
    :param chunk_size: Number of rows per chunk.
    :param metadata: Dictionary with custom metadata to add to the Parquet files.
    """
    if not settings:
        settings = BatchSettings()

    chunk_size = None
    num_buckets = None
    if settings.items and settings.items.maximum:
        chunk_size = settings.items.maximum
    elif settings.count and settings.count.maximum:
        num_buckets = settings.count.maximum

    if chunk_size is not None and num_buckets is not None:
        chunk_size = DEFAULT_BATCH_ITEMS_VALUE

    df, dfs, series_sample, object_metadata = multi_series_to_frame(df, dfs)

    chunk_sizes = [] + ([chunk_size] if chunk_size else [])
    if dfs is not None:
        num_buckets = len(dfs)
        df = pl.DataFrame([])

        # Process a list of DataFrames with index as chunk if dfs is provided
        for index, dataframe in enumerate(dfs):
            chunk_size_for_index = dataframe.height

            # Use index as chunk number
            dataframe_with_chunk = append_chunk_column(
                dataframe,
                use_index_as_chunk=True,
                index=index,
                total_rows=chunk_size_for_index,
            )

            # Convert the Polars DataFrame to a PyArrow Table
            df = df.vstack(dataframe_with_chunk)

            chunk_sizes.append(chunk_size_for_index)
            if is_debug():
                print(f'Chunk size for index {index}: {chunk_size_for_index}')
    elif df is not None and (chunk_size or num_buckets) and isinstance(df, pl.DataFrame):
        df = add_chunk_column(df, chunk_size=chunk_size, num_buckets=num_buckets)

    if df is None:
        raise ValueError('No DataFrame provided to write.')

    metadata = metadata or {}
    if chunk_sizes:
        metadata['chunk_sizes'] = chunk_sizes
    if num_buckets:
        metadata['num_buckets'] = num_buckets
    if object_metadata:
        metadata['object'] = json.dumps(object_metadata)

    # Convert the Polars DataFrame to a PyArrow Table first
    table = add_custom_metadata_to_table(df.to_arrow(), metadata)

    if chunk_size or num_buckets:
        partition_cols = (partition_cols or []) + [COLUMN_CHUNK]

    # Utilize PyArrow's write_to_dataset function to handle partitioning
    yield table, partition_cols

    partition_directories = glob.glob(f'{output_dir}/*')
    num_partitions = len(partition_directories)
    total_rows = table.num_rows
    total_columns = len(table.schema.names)

    if is_debug():
        print(
            f'{total_rows} rows with {total_columns} columns '
            f"written to '{output_dir}' across {num_partitions} partitions."
        )
