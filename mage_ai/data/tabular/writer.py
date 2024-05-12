import glob
import os
import shutil
from typing import Dict, List, Optional

import polars as pl
import pyarrow as pa
from pyarrow import parquet as pq

from mage_ai.data.tabular.constants import COLUMN_CHUNK


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
        chunks = (
            [0] * total_rows
        )  # Default to all rows in the same chunk if no parameters are provided

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

    print(
        f'Chunk size: {chunk_size}, Total rows: {total_rows}, Num buckets: {num_buckets}'
    )

    return append_chunk_column(df, chunk_size, total_rows, use_index_as_chunk, index)


def add_custom_metadata_to_table(table: pa.Table, metadata: Dict) -> pa.Table:
    # This is a placeholder function. Adapt it based on your actual metadata handling.
    # Access existing metadata (if any) and merge with custom metadata
    existing_metadata = (
        table.schema.metadata if table.schema.metadata is not None else {}
    )
    updated_metadata = {
        **existing_metadata,
        **{key.encode(): str(value).encode() for key, value in metadata.items()},
    }

    # Update PyArrow Table schema with merged metadata
    new_schema = table.schema.with_metadata(updated_metadata)
    return table.replace_schema_metadata(new_schema.metadata)


def write_polars_df_with_partitioning(
    output_dir: str,
    df: Optional[pl.DataFrame] = None,
    dfs: Optional[List[pl.DataFrame]] = None,
    chunk_size: Optional[int] = None,
    metadata: Optional[Dict] = None,
    num_buckets: Optional[int] = None,
    partition_cols: Optional[List[str]] = None,
    replace: bool = False,
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
            print(f'Chunk size for index {index}: {chunk_size_for_index}')
    elif df is not None and (chunk_size or num_buckets):
        df = add_chunk_column(df, chunk_size=chunk_size, num_buckets=num_buckets)

    if df is None:
        raise ValueError('No DataFrame provided to write.')

    metadata = metadata or {}
    if chunk_sizes:
        metadata['chunk_sizes'] = chunk_sizes
    if num_buckets:
        metadata['num_buckets'] = num_buckets

    if chunk_size or num_buckets:
        partition_cols = (partition_cols or []) + [COLUMN_CHUNK]

    # Convert the Polars DataFrame to a PyArrow Table first
    table = add_custom_metadata_to_table(df.to_arrow(), metadata)

    # Ensure the output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Overwrite logic: delete existing data before writing
    if replace and os.path.exists(output_dir):
        shutil.rmtree(output_dir)
        print(f"Existing data in '{output_dir}' has been deleted for replace mode.")

    # Utilize PyArrow's write_to_dataset function to handle partitioning
    pq.write_to_dataset(
        table,
        root_path=output_dir,
        partition_cols=partition_cols,  # This argument enforces Hive-style partitioning.
        use_dictionary=True,
        compression='snappy',
    )

    partition_directories = glob.glob(f'{output_dir}/*')
    num_partitions = len(partition_directories)
    total_rows = table.num_rows
    total_columns = len(table.schema.names)

    print(
        f'{total_rows} rows with {total_columns} columns '
        f"written to '{output_dir}' across {num_partitions} partitions."
    )
