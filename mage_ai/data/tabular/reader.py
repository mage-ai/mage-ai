import asyncio
import json
import os
from concurrent.futures import ThreadPoolExecutor
from functools import reduce
from typing import Any, AsyncGenerator, Dict, Generator, List, Optional, Tuple, Union

import pandas as pd
import polars as pl
import pyarrow as pa
import pyarrow.dataset as ds
import pyarrow.parquet as pq

from mage_ai.data.constants import (
    AsyncRecordBatchGenerator,
    RecordBatch,
    RecordBatchGenerator,
    ScanBatchDatasetResult,
    TaggedRecordBatch,
)
from mage_ai.data.models.generator import GeneratorWithMetadata
from mage_ai.data.tabular.constants import FilterComparison
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data.tabular.utils import compare_object
from mage_ai.shared.array import find, flatten

DatasetMetadata = Dict[
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
]


async def run_in_executor(func, *args):
    executor = ThreadPoolExecutor()
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(executor, func, *args)


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

    schema_field = ds.field(column_name)
    if FilterComparison.EQUAL == comparison:
        return schema_field == value
    elif FilterComparison.NOT_EQUAL == comparison:
        return schema_field != value
    elif FilterComparison.LESS_THAN == comparison:
        return schema_field < value
    elif FilterComparison.LESS_THAN_OR_EQUAL == comparison:
        return schema_field <= value
    elif FilterComparison.GREATER_THAN == comparison:
        return schema_field > value
    elif FilterComparison.GREATER_THAN_OR_EQUAL == comparison:
        return schema_field >= value
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
) -> DatasetMetadata:
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
    for root, _dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.parquet') and not file.startswith('sample'):
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
                    elif hasattr(column, 'compressed_size'):  # if compressed_size attribute exists
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
            for schema_field in schema:
                column_name = schema_field.name
                column_type = str(schema_field.type)  # This should now work as expected
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
        'num_files': len(parquet_files),
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

    return flatten([
        [
            get_object_metadata(get_file_metadata(file_details))
            for file_details in get_file_details(metadata)
        ]
        for metadata in metadatas
    ])


def get_series_object_metadata(
    metadatas: Optional[List[Any]] = None,
    source: Optional[Union[List[str], str]] = None,
) -> Optional[Dict[str, str]]:
    def __check(object_metadata: Dict[str, str]) -> bool:
        return (
            compare_object(
                pd.Series,
                object_metadata,
            )
            or compare_object(
                pl.Series,
                object_metadata,
            )
            or compare_object(
                pd.DataFrame,
                object_metadata,
            )
        )

    return find(__check, get_all_objects_metadata(metadatas=metadatas, source=source))


def __builder_scanner_generator_configurations(
    source: Union[List[str], str],
    chunks: Optional[List[int]] = None,
    columns: Optional[List[str]] = None,
    filter: Optional[ds.Expression] = None,
    filters: Optional[List[List[str]]] = None,
    settings: Optional[BatchSettings] = None,
    **kwargs,
) -> Tuple[
    ds.Dataset,
    Dict[str, Optional[Union[bool, int, List[str]]]],
    List[DatasetMetadata],
]:
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
    - start_row: The starting row index.
    - end_row: The ending row index.

    Returns:
    Iterator[Union[pa.RecordBatch, ds.TaggedRecordBatch]] -
        An iterator over the scanned (and optionally deserialized) batches of records.
    """
    if isinstance(source, list):
        dataset = ds.dataset(
            [ds.dataset(path, format='parquet', partitioning='hive') for path in source],
        )
    else:
        dataset = ds.dataset(source, format='parquet', partitioning='hive')

    metadatas = []
    for directory in source if isinstance(source, list) else [source]:
        metadatas.append(read_metadata(directory, include_schema=True))

    if settings:
        if isinstance(settings, dict):
            settings = BatchSettings.load(**settings)
    else:
        settings = BatchSettings()
    batch_size = settings.items.minimum or settings.items.maximum

    def __create_filter(chunk_query: str, dataset=dataset):
        column, value = chunk_query.split('=')
        # Find the actual data type of the column in the dataset
        actual_type = dataset.schema.field(column).type

        # Attempt to convert the value to the actual data type of the column
        if pa.types.is_string(actual_type):
            # If the field is of string type, ensure the value is also treated as a string
            value = str(value)
        elif pa.types.is_integer(actual_type):
            # If the field is of integer type, try converting the value to an integer
            try:
                value = int(value)
            except ValueError:
                raise ValueError(
                    f"Could not convert value '{value}' to integer for column '{column}'."
                )
        elif pa.types.is_float(actual_type):
            # Similar conversion for floating-point types, as needed
            try:
                value = float(value)
            except ValueError:
                raise ValueError(
                    f"Could not convert value '{value}' to float for column '{column}'."
                )
        # Add more type checks as necessary for your use cases

        # Return the filter expression
        return ds.field(column) == value

    filters_list = []
    if chunks:
        # ["chunk=1", "chunk=100", "chunk=1000"]
        filters_list.append(
            reduce(
                lambda a, b: a | b,
                [__create_filter(str(chunk)) for chunk in chunks],
            )
        )

    if filters:

        def __create_filters(filters_strings: List[str]) -> ds.Expression:
            return reduce(lambda a, b: create_filter(a) & create_filter(b), filters_strings)

        filters_list.append(
            reduce(lambda a, b: __create_filters(a) | __create_filters(b), filters),
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
    scanner_settings: Dict[str, Optional[Union[bool, int, List[str]]]] = dict(
        columns=columns,
        filter=expression,
        use_threads=True,
    )
    if batch_size and batch_size >= 1:
        scanner_settings['batch_size'] = batch_size

    return dataset, scanner_settings, metadatas


def __wrap_generator(
    generator: Generator,
    metadatas: List[DatasetMetadata],
    deserialize: Optional[bool] = None,
    scan: Optional[bool] = False,
) -> RecordBatchGenerator:
    object_metadata = get_series_object_metadata(metadatas=metadatas)
    for tagged_or_record_batch in GeneratorWithMetadata(generator, metadata=metadatas):
        record_batch_class = TaggedRecordBatch if scan else RecordBatch
        batch: Union[TaggedRecordBatch, RecordBatch] = record_batch_class(
            tagged_or_record_batch,
            object_metadata=object_metadata,
        )
        if deserialize:
            yield batch.deserialize()
        else:
            yield batch


def scan_dataset_parts(
    *args,
    deserialize: Optional[bool] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    **kwargs,
) -> Any:
    dataset, scanner_settings, metadatas = __builder_scanner_generator_configurations(
        *args, **kwargs
    )

    num_rows = 0
    if len(metadatas) >= 1:
        num_rows = metadatas[0]['num_rows']
        if not isinstance(num_rows, int):
            num_rows = 0

    offset = offset or 0
    limit = limit or num_rows

    total_rows_scanned = 0
    start_row = offset or 0
    rows_to_process = limit

    generator = dataset.scanner(**scanner_settings).scan_batches()

    for batch in generator:
        if not batch:
            break

        if hasattr(batch, 'record_batch'):
            batch = batch.record_batch

        num_rows_in_batch = batch.num_rows
        if total_rows_scanned + num_rows_in_batch < start_row:
            # Entire batch is before the start_row; skip it.
            total_rows_scanned += num_rows_in_batch
            continue

        # Calculate the slice of the current batch that is within [start_row, end_row].
        offset_within_batch = max(start_row - total_rows_scanned, 0)
        length_within_batch = min(rows_to_process, num_rows_in_batch - offset_within_batch)

        if length_within_batch > 0:
            object_metadata = get_series_object_metadata(metadatas=metadatas)
            sliced_batch = batch.slice(offset=offset_within_batch, length=length_within_batch)
            record_batch = RecordBatch(sliced_batch, object_metadata=object_metadata)
            yield record_batch.deserialize() if deserialize else record_batch
            rows_to_process -= length_within_batch

        total_rows_scanned += num_rows_in_batch
        if rows_to_process <= 0:
            # Processed all rows in the range; exit loop.
            break


def scan_batch_datasets_generator(
    *args, deserialize: Optional[bool] = None, scan: Optional[bool] = False, **kwargs
) -> RecordBatchGenerator:
    dataset, scanner_settings, metadatas = __builder_scanner_generator_configurations(
        *args, **kwargs
    )

    if scan:
        generator = dataset.scanner(**scanner_settings).scan_batches()
    else:
        generator = dataset.to_batches(**scanner_settings)

    return __wrap_generator(
        generator,
        metadatas,
        deserialize=deserialize,
        scan=scan,
    )


async def scan_batch_datasets_generator_async(
    source: Union[List[str], str], **kwargs
) -> AsyncRecordBatchGenerator:
    generator = scan_batch_datasets_generator(source, **kwargs)

    async def async_generator_wrapper():
        for item in generator:
            yield await run_in_executor(lambda item=item: item)

    return async_generator_wrapper()


def scan_batch_datasets(source: Union[List[str], str], **kwargs) -> Generator:
    """
    Cannot have a yield statement or else the return will never be reached.
    In Python, if a function contains a `yield` statement,
    it turns the function into a generator function.
    This means that the function will return a generator object,
    but none of its code will run immediately.
    The function only executes on iteration.
    """
    for tagged_or_record_batch_or_deserialized in scan_batch_datasets_generator(source, **kwargs):
        yield tagged_or_record_batch_or_deserialized


async def scan_batch_datasets_async(source: Union[List[str], str], **kwargs) -> AsyncGenerator:
    generator = await scan_batch_datasets_generator_async(source, **kwargs)

    async for tagged_or_record_batch_or_deserialized in generator:
        yield tagged_or_record_batch_or_deserialized


def sample_batch_datasets(
    source: Union[List[str], str],
    sample_count: Optional[int] = None,
    settings: Optional[BatchSettings] = None,
    **kwargs,
) -> Optional[ScanBatchDatasetResult]:
    settings = settings if settings else BatchSettings()
    if sample_count:
        settings.items.maximum = sample_count

    generator = scan_batch_datasets_generator(source, **kwargs, settings=settings)

    try:
        batch = next(generator)
        if batch is not None:
            return batch
    except StopIteration:
        pass


async def sample_batch_datasets_async(
    source: Union[List[str], str],
    sample_count: Optional[int] = None,
    settings: Optional[BatchSettings] = None,
    **kwargs,
) -> Optional[ScanBatchDatasetResult]:
    settings = settings if settings else BatchSettings()
    if sample_count:
        settings.items.maximum = sample_count

    generator = await scan_batch_datasets_generator_async(source, **kwargs, settings=settings)

    async for batch in generator:
        if batch is not None:
            return batch
            break
