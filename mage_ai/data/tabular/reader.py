import json
import os
from functools import reduce
from math import ceil
from typing import Any, Dict, Iterator, List, Optional, Union

import pandas as pd
import polars as pl
import pyarrow as pa
import pyarrow.dataset as ds
import pyarrow.parquet as pq

from mage_ai.data.tabular.constants import (
    COLUMN_CHUNK,
    DEFAULT_BATCH_BYTE_VALUE,
    DEFAULT_BATCH_COUNT_VALUE,
    DEFAULT_BATCH_ITEMS_VALUE,
    BatchStrategy,
    FilterComparison,
)
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.shared.array import find, flatten


def create_filter(*args) -> ds.Expression:
    """
    Dynamically creates a filter expression for a given column, value, and comparison operation.
    Args:
    - column_name (str): The name of the column to filter on.
    - value (Any): The value to compare against.
    - comparison (str): Type of comparison ('==', '!=', '<', '<=', '>', '>=')
    Returns:
    - ds.Expression: A PyArrow dataset filter expression.
    Raises:
    - ValueError: If an unsupported comparison type is provided.
    """
    expression = args[0] if len(args) == 1 else args
    if isinstance(expression, str):
        column_name, comparison, value = [s.strip() for s in expression.split(' ')]
    else:
        column_name, comparison, value = expression

    value = FilterComparison(value) if isinstance(value, str) else value

    field = ds.field(column_name)
    if FilterComparison.EQUAL == comparison:
        return field == value
    elif FilterComparison.NOT_EQUAL == comparison:
        return field != value
    elif FilterComparison.LESS_THAN == comparison:
        return field < value
    elif FilterComparison.LESS_THAN_OR_EQUAL == comparison:
        return field <= value
    elif FilterComparison.GREATER_THAN == comparison:
        return field > value
    elif FilterComparison.GREATER_THAN_OR_EQUAL == comparison:
        return field >= value
    else:
        raise ValueError(f'Unsupported comparison type: {comparison}')


def partition_from_path(file_path: str) -> Optional[Dict[str, str]]:
    """
    Extracts partition key-value pairs from a given Parquet file path.
    :param file_path: The full path to a Parquet file.
    :return: A dictionary with partition key-value pairs if any exist in the path.
    """
    partition_info = {}

    # Split the path into segments
    path_segments = file_path.split('/')

    # Iterate over each segment to find partitions (<key>=<value>)
    for segment in path_segments:
        if '=' in segment:
            key, value = segment.split('=', 1)
            partition_info[key] = value

    return partition_info if partition_info else None


def read_metadata(
    directory: str, include_row_groups: bool = False, include_schema: bool = False
) -> Dict[
    str,
    Union[
        int,
        Dict[
            str,
            Dict[
                str,
                List[str],
            ],
        ],
        List[
            Dict[
                str,
                Union[str, int, Dict[str, str]],
            ]
        ],
    ],
]:
    """
    Reads metadata and optionally the schema from all Parquet files in the specified directory
    without loading the full datasets into memory.
    :param directory: Path to the directory containing Parquet files.
    :param include_schema: A boolean flag to include schema information in the output.
    :return: A dictionary containing metadata and optionally schema information.
    """
    file_details_list = []

    num_rows_total = 0
    total_byte_size = 0  # Initialize total byte size

    # List all Parquet files in the directory
    parquet_files = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.parquet'):
                parquet_files.append(os.path.join(root, file))

    schema_combined = {}

    for file_path in parquet_files:
        file_details = {'file_path': file_path}
        file_stats = os.stat(file_path)  # Get file statistics

        # Use file size from file system
        file_byte_size = file_stats.st_size
        total_byte_size += file_byte_size  # Aggregate byte size
        file_details['byte_size'] = file_byte_size

        # Read only the metadata of the Parquet file
        parquet_file = None
        if include_schema:
            parquet_file = pq.ParquetFile(file_path)
            parquet_metadata = parquet_file.metadata
        else:
            parquet_metadata = pq.read_metadata(file_path)

        # Extract Partition Details
        partition = partition_from_path(file_path)
        if partition:
            file_details['partition'] = partition

        num_rows = parquet_metadata.num_rows
        num_rows_total += num_rows

        file_details['num_rows'] = num_rows
        file_details['num_columns'] = parquet_metadata.num_columns
        file_details['num_row_groups'] = parquet_metadata.num_row_groups

        if include_row_groups:
            row_group_info = []
            for i in range(parquet_metadata.num_row_groups):
                row_group = parquet_metadata.row_group(i)
                row_group_details = {'num_rows': row_group.num_rows, 'columns': []}
                for j in range(row_group.num_columns):
                    column = row_group.column(j)
                    column_details = {'compression': column.compression}

                    # Using total_compressed_size if available,
                    # otherwise fallback to checking the compressed size or file_offset
                    if hasattr(column, 'total_compressed_size'):
                        column_details['byte_size'] = column.total_compressed_size
                    elif hasattr(
                        column, 'compressed_size'
                    ):  # if compressed_size attribute exists
                        column_details['byte_size'] = column.compressed_size
                    elif hasattr(
                        column, 'file_offset'
                    ):  # as a last resort or an alternative method
                        # file_offset doesn't give the size of the column data directly
                        # You might need to calculate or handle it differently.
                        column_details['byte_size'] = column.file_offset

                    column_details['schema_path'] = column.path_in_schema

                    row_group_details['columns'].append(column_details)
                row_group_info.append(row_group_details)

            file_details['row_groups'] = row_group_info

        # Accessing key-value metadata correctly
        key_value_metadata = {}
        if parquet_metadata.metadata:
            # Convert the result into a dictionary format if it's not None
            key_value_metadata = {}
            for k, v in parquet_metadata.metadata.items():
                k = k.decode('utf-8') if isinstance(k, bytes) else k
                v = v.decode('utf-8') if isinstance(v, bytes) else v
                key_value_metadata[k] = v
        file_details['metadata'] = key_value_metadata

        if include_schema and parquet_file is not None:
            schema_info = {}
            schema = (
                parquet_file.schema.to_arrow_schema()
            )  # Convert PyArrow Parquet schema to Arrow schema
            for field in schema:
                column_name = field.name
                column_type = str(field.type)  # This should now work as expected
                schema_info[column_name] = column_type

                if column_name not in schema_combined:
                    schema_combined[column_name] = {}
                if column_type not in schema_combined[column_name]:
                    schema_combined[column_name][column_type] = []
                if partition:
                    schema_combined[column_name][column_type].append(partition)

            file_details['schema'] = schema_info

        file_details_list.append(file_details)

    return {
        'files': file_details_list,
        'num_partitions': len(file_details_list),
        'num_rows': num_rows_total,
        'schema': schema_combined,
        'total_byte_size': total_byte_size,  # Return total byte size
    }


def get_file_metadata(file_details: Any) -> Dict[str, str]:
    return file_details['metadata']


def get_object_metadata(file_metadata: Dict[str, str]) -> Dict[str, str]:
    if file_metadata is not None:
        object_metadata_json: Optional[str] = file_metadata.get('object', None)
        if object_metadata_json is not None:
            return json.loads(object_metadata_json)
    return {}


def get_file_details(
    dataset_metadata_dict: Any,
) -> List[
    Dict[
        str,
        Union[str, int, Dict[str, str]],
    ]
]:
    file_details_list = dataset_metadata_dict['files']

    if isinstance(file_details_list, list) and len(file_details_list) >= 1:
        return file_details_list

    return []


def compare_object(object: Any, object_metadata: Dict[str, str]) -> bool:
    return (
        object_metadata.get('module') == object.__module__
        and object_metadata.get('name') == object.__name__
    )


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


def get_all_objects_metadata(
    metadatas: Optional[List[Any]] = None,
    source: Optional[Union[List[str], str]] = None,
) -> List[Dict[str, str]]:
    if metadatas is None and source is not None:
        metadatas = [
            read_metadata(directory)
            for directory in (source if isinstance(source, list) else [source])
        ]

    if metadatas is None:
        return []

    return flatten(
        [
            [
                get_object_metadata(get_file_metadata(file_details))
                for file_details in get_file_details(metadata)
            ]
            for metadata in metadatas
        ]
    )


def get_series_object_metadata(
    metadatas: Optional[List[Any]] = None,
    source: Optional[Union[List[str], str]] = None,
) -> Optional[Dict[str, str]]:
    def __check(object_metadata: Dict[str, str]) -> bool:
        return compare_object(
            pd.Series,
            object_metadata,
        ) or compare_object(
            pl.Series,
            object_metadata,
        )

    return find(__check, get_all_objects_metadata(metadatas=metadatas, source=source))


def scan_batch_datasets(
    source: Union[List[str], str],
    batch_strategy: Optional[BatchStrategy] = None,
    batch_value: Optional[int] = None,
    chunks: Optional[List[int]] = None,
    columns: Optional[List[str]] = None,
    deserialize: Optional[bool] = False,
    filter: Optional[ds.Expression] = None,
    filters: Optional[List[List[str]]] = None,
    return_generator: Optional[bool] = False,
    scan: Optional[bool] = False,
    settings: Optional[BatchSettings] = None,
) -> Iterator[Union[pa.RecordBatch, ds.TaggedRecordBatch]]:
    """
    Scans and optionally deserializes batches of records from a dataset.

    Parameters:
    - source: Union[List[str], str] - The path(s) to the dataset(s) in Parquet format.
    - batch_value: Optional[int] = DEFAULT_BATCH_SIZE - The number of records to include
        in each batch.
    - chunks: Optional[List[int]] = None - Specific chunks of the dataset to scan.
    - columns: Optional[List[str]] = None - Specific columns to include in the output.
    - deserialize: Optional[bool] = False - Whether to deserialize the scanned batches into a
        more user-friendly format.
    - filter: Optional[ds.Expression] = None - A single filter expression to apply to the dataset.
    - filters: Optional[List[List[str]]] = None - A list of filter expressions to apply to
        the dataset.
    - return_generator: Optional[bool] = False - Whether to return a generator or directly
        yield the batches.
    - scan: Optional[bool] = False - Whether to use the scanner interface, which can be more
        efficient for certain operations.
        Use scan_batches which yields record batches directly from the scan operation
    - settings: Optional[BatchSettings] = None - Additional settings for batch scanning,
        not used in this function but provided for extension.

    Returns:
    Iterator[Union[pa.RecordBatch, ds.TaggedRecordBatch]] -
        An iterator over the scanned (and optionally deserialized) batches of records.
    """
    dataset = ds.dataset(source, format='parquet', partitioning='hive')
    metadatas = []
    for directory in source if isinstance(source, list) else [source]:
        metadatas.append(read_metadata(directory))
    object_metadata = get_series_object_metadata(metadatas=metadatas)

    num_rows_total, total_byte_size = reduce(
        lambda acc, metadata: (
            acc[0] + metadata['num_rows'],
            acc[1] + metadata['total_byte_size'],
        ),
        metadatas,
        (0, 0),
    )

    batch_strategy = batch_strategy or BatchStrategy.ITEMS
    if BatchStrategy.ITEMS == batch_strategy:
        batch_size = batch_value or DEFAULT_BATCH_ITEMS_VALUE
    elif BatchStrategy.BYTES == batch_strategy:
        batch_value = batch_value or DEFAULT_BATCH_BYTE_VALUE
        batch_size = calculate_batch_value(batch_value, num_rows_total, total_byte_size)
    elif BatchStrategy.COUNT == batch_strategy:
        batch_value = batch_value or DEFAULT_BATCH_COUNT_VALUE
        batch_size = ceil(num_rows_total / batch_value)
    else:
        batch_size = DEFAULT_BATCH_ITEMS_VALUE

    filters_list = []
    if chunks:
        filters_list.append(
            reduce(
                lambda a, b: a | b,
                [
                    create_filter(COLUMN_CHUNK, FilterComparison.EQUAL, chunk)
                    for chunk in chunks
                ],
            )
        )

    if filters:

        def __create_filters(filters_strings: List[str]) -> ds.Expression:
            return reduce(
                lambda a, b: create_filter(a) & create_filter(b), filters_strings
            )

        filters_list.append(
            reduce(lambda a, b: __create_filters(a) | __create_filters(b), filters)
        )

    if filter:
        filters_list.append(filter)

    expression = None
    if len(filters_list) >= 1:
        expression = reduce(lambda a, b: a & b, filters_list)

    """
    - `batch_size` controls how many rows are included in each batch.
    - `columns`, if specified, controls which columns are loaded.
    - `filter` allows filtering rows based on specific criteria before they are loaded.
    - `use_threads=True` enables multithreading to potentially speed up the data loading process.
    """
    scanner_settings = dict(
        batch_size=batch_size,
        columns=columns,
        filter=expression,
        use_threads=True,
    )

    if return_generator:
        if scan:
            return dataset.scanner(**scanner_settings).scan_batches()
        else:
            return dataset.to_batches(**scanner_settings)

    if scan:
        for tagged_record_batch in dataset.scanner(**scanner_settings).scan_batches():
            yield (
                deserialize_batch(tagged_record_batch, object_metadata=object_metadata)
                if deserialize
                else tagged_record_batch
            )
    else:
        for record_batch in dataset.to_batches(**scanner_settings):
            yield (
                deserialize_batch(record_batch, object_metadata=object_metadata)
                if deserialize
                else record_batch
            )


def calculate_batch_value(
    max_batch_value_bytes: int,
    total_row_count: int,
    total_byte_size: int,
):
    # Estimate the byte size per row
    estimated_bytes_per_row = total_byte_size / total_row_count

    # Calculate the number of rows per batch based on the maximum batch size
    return max(1, int(max_batch_value_bytes / estimated_bytes_per_row))
