import io
import json
import os
import sys
from collections import deque
from collections.abc import Container, Iterable, Mapping
from logging import Logger
from sys import getsizeof
from typing import Any, Callable, Dict

import joblib
import pandas as pd
import psutil
import pyarrow.parquet as pq

from mage_ai.data_preparation.logging.logger import DictLogger


def __log(log_message: str, logger: Logger = None, logging_tags: Dict = None):
    if logger:
        if isinstance(logger, DictLogger):
            logger.info(log_message, tags=logging_tags)
        else:
            logger.info(log_message)
            if logging_tags:
                logger.info(json.dumps(logging_tags, indent=2))
    else:
        print(log_message)
        if logging_tags:
            print(json.dumps(logging_tags, indent=2))


def get_memory_usage(
    log: bool = True,
    logger: Logger = None,
    logging_tags: Dict = None,
    message_prefix: str = None,
    wrapped_function: Callable = None,
) -> Any:
    process = psutil.Process(os.getpid())
    value = process.memory_info().rss

    if log or logger:
        message = (
            f'{message_prefix + " " if message_prefix else ""}'
            f'Memory usage: {value / (1024 * 1024)} MB'
        )
        __log(message, logger=logger, logging_tags=logging_tags)

    if wrapped_function:
        result = wrapped_function()

        value_after = process.memory_info().rss
        if log or logger:
            message = (
                f'{message_prefix + " " if message_prefix else ""}'
                f'Memory usage after function: {value_after / (1024 * 1024)} MB '
                f'(added {(value_after - value) / (1024 * 1024)} MB)'
            )
            __log(message, logger=logger, logging_tags=logging_tags)

        return result

    return value


async def get_memory_usage_async(
    log: bool = True,
    logger: Logger = None,
    logging_tags: Dict = None,
    message_prefix: str = None,
    wrapped_function: Callable = None,
) -> Any:
    process = psutil.Process(os.getpid())
    value = process.memory_info().rss

    if log or logger:
        message = (
            f'{message_prefix + " " if message_prefix else ""}'
            f'Memory usage: {value / (1024 * 1024)} MB'
        )
        __log(message, logger=logger, logging_tags=logging_tags)

    if wrapped_function:
        result = await wrapped_function()

        value_after = process.memory_info().rss
        if log or logger:
            message = (
                f'{message_prefix + " " if message_prefix else ""}'
                f'Memory usage after function: {value_after / (1024 * 1024)} MB '
                f'(added {(value_after - value) / (1024 * 1024)} MB)'
            )
            __log(message, logger=logger, logging_tags=logging_tags)

        return result

    return value


def estimate_parquet_memory_usage(file_path: str) -> float:
    """
    Adjusted function to estimate the memory usage of a Parquet file when loaded.
    It utilizes PyArrow to access the metadata for a more accurate estimation.

    Args:
        file_path (str) - The path to the Parquet file.

    Returns:
        float: The estimated memory usage in bytes.
    """
    if not file_path.endswith('.parquet'):
        raise ValueError("Not a Parquet file.")
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"File {file_path} not found.")

    # Use PyArrow to read metadata
    parquet_file = pq.ParquetFile(file_path)
    metadata = parquet_file.metadata

    # The actual memory usage can vary significantly based on the data types
    # and compression used in the file. Loop through all row groups to sum their uncompressed sizes.
    total_uncompressed_size = sum(
        metadata.row_group(i).total_byte_size for i in range(metadata.num_row_groups)
    )

    # This gives you the total uncompressed size of the data in the Parquet file,
    # which is a better approximation of its in-memory size than disk size,
    # especially as Parquet files are often compressed.
    return total_uncompressed_size


def estimate_file_memory_usage(file_path: str) -> Dict[str, float]:
    """
    Estimates the amount of memory a file will take up when loaded into memory.
    This is a rough estimation and actual memory usage can vary.

    Args:
        file_path (str): The path to the file on disk.

    Returns:
        dict: A dictionary containing the size on disk, and estimated memory usage in bytes.
    """
    if not os.path.isfile(file_path):
        return {}

    file_size = os.path.getsize(file_path)  # Size in bytes

    # Assuming the file will roughly take the same amount of memory in bytes as its size on disk.
    # This assumption holds for binary files but can vary for text files depending on the encoding,
    # and how the data is processed or represented in memory.

    # Default assumption: memory usage is equal to file size
    estimated_memory_usage = file_size

    # Estimate memory usage based on file type
    if file_path.endswith('.txt'):
        # Assume each character takes 1 byte
        estimated_memory_usage = file_size
    elif file_path.endswith('.csv'):
        # Assume each character takes 1 byte and add overhead for data structures
        estimated_memory_usage = file_size * 1.2
    elif file_path.endswith('.json'):
        # Assume each character takes 1 byte and add overhead for data structures
        estimated_memory_usage = file_size * 1.5
    elif file_path.endswith('.parquet'):
        # Estimate memory usage based on the Parquet file format
        estimated_memory_usage = estimate_parquet_memory_usage(file_path)
    elif file_path.endswith('.ubj'):
        # Assuming UBJ files expand less than JSON due to their efficient binary format
        # This is a heuristic and may need adjustment based on actual data
        estimated_memory_usage *= 2  # Assuming some expansion in memory
    elif file_path.endswith('.joblib'):
        # Joblib files are used for serializing Python objects. The memory usage
        # Could be quite different from the file size depending on the object.
        # Using a heuristic here, but for accurate measurements, deserialization might be necessary.
        estimated_memory_usage *= 4  # Assuming significant expansion due to decompression

    # If you want to add specific estimates for different file types
    # (e.g., images, serialized objects),
    # you could extend this function with more logic.

    return {
        "size_on_disk_bytes": file_size,
        "estimated_memory_usage_bytes": estimated_memory_usage,
    }


def deep_getsizeof(o, ids) -> float:
    """Find the memory footprint of a Python object, including the contents of containers."""
    if id(o) in ids:
        return 0

    ids.add(id(o))
    size = getsizeof(o)

    if isinstance(o, str) or isinstance(o, bytes):
        return size

    if isinstance(o, Mapping):
        size += sum((deep_getsizeof(k, ids) + deep_getsizeof(v, ids) for k, v in o.items()))

    elif isinstance(o, Container):
        size += sum((deep_getsizeof(i, ids) for i in o))

    return size


def estimate_object_memory(obj) -> float:
    """Estimate the memory usage of an object including its contents."""
    return deep_getsizeof(obj, set())


def estimate_memory_usage(obj) -> float:
    """
    Estimates the memory usage of various object instances in Python.

    Args:
    - obj: the object instance for which to estimate memory usage.

    Returns:
    - The estimated memory size in bytes.
    """
    if isinstance(obj, dict):
        return sum(
            (getsizeof(key) + getsizeof(value) for key, value in obj.items())) + getsizeof(obj)
    elif isinstance(obj, Iterable) and not isinstance(obj, str):
        return sum((getsizeof(item) for item in obj)) + getsizeof(obj)
    try:
        # Use specialized methods for complex types if available.
        obj_type = type(obj).__name__.lower()
        if obj_type == 'dataframe':
            return obj.memory_usage(deep=True).sum()
        elif obj_type == 'geodataframe':
            return obj.memory_usage(deep=True).sum() + getsizeof(obj.geometry)
        elif obj_type in ['series', 'series_pandas']:
            return obj.memory_usage(deep=True)
        elif obj_type == 'matrix_sparse':
            return getsizeof(obj.data) + getsizeof(obj.indices) + getsizeof(obj.indptr)
        elif obj_type in ['model_sklearn', 'model_xgboost']:
            import joblib
            return len(joblib.dumps(obj))
        elif obj_type == 'polars_dataframe':
            return obj.heap_size()
        elif obj_type == 'spark_dataframe':
            # Spark DataFrames are distributed, it's tricky to estimate accurately without scanning.
            # This would just be a placeholder as actual memory usage requires cluster state.
            return 0
        elif obj_type == 'custom_object':
            # A more complex heuristic might be necessary here.
            return getsizeof(obj)  # Likely an underestimate for complex custom objects.
        else:
            return getsizeof(obj)
    except AttributeError:
        # Fallback for objects that don't fit handled types or lack memory usage methods
        return getsizeof(obj)


def enhanced_estimate_memory_usage(obj) -> float:
    """
    Enhanced memory usage estimation for a broad spectrum of Python object types,
    focusing on native data structures, pandas objects, and handling for complex or
    custom objects that might be serialized (e.g., machine learning models).
    """
    visited_ids = set()
    queue = deque([obj])
    total_size = 0

    while queue:
        current_obj = queue.popleft()
        obj_id = id(current_obj)
        if obj_id in visited_ids:
            continue

        visited_ids.add(obj_id)

        # Initially, add the object's own size
        total_size += getsizeof(current_obj)

        # Extend the queue with object contents, if applicable
        if isinstance(current_obj, dict):
            queue.extend(current_obj.keys())
            queue.extend(current_obj.values())
        elif isinstance(current_obj, (list, tuple, set, frozenset)):
            queue.extend(current_obj)
        elif hasattr(current_obj, '__dict__'):
            queue.append(current_obj.__dict__)
        elif hasattr(current_obj, '__slots__'):
            queue.extend(getattr(
                current_obj,
                slot,
            ) for slot in current_obj.__slots__ if hasattr(current_obj, slot))

        # Special handling for objects that support direct memory usage estimation
        if isinstance(current_obj, pd.DataFrame):
            # For DataFrame, use pandas' `memory_usage(deep=True)` method
            total_size += current_obj.memory_usage(deep=True).sum()
        elif isinstance(current_obj, (pd.Series, pd.Index)):
            # Ditto for Series and Index
            total_size += current_obj.memory_usage(deep=True)

        # Handle serialization-based estimation for complex objects
        elif type(current_obj).__name__ in ['Booster', 'XGBModel']:  # Example for ML models
            # Serialize the object into a bytes buffer and measure its size
            buffer = io.BytesIO()
            joblib.dump(current_obj, buffer)
            total_size += buffer.tell()

    return total_size


def get_csr_matrix_memory_usage(csr):
    """
    Estimate memory usage of a csr_matrix.

    Parameters:
    - csr: The csr_matrix whose memory usage is to be estimated.

    Returns:
    - The estimated memory usage in bytes.
    """
    base_size = sys.getsizeof(csr)
    data_size = csr.data.nbytes
    indices_size = csr.indices.nbytes
    indptr_size = csr.indptr.nbytes

    total_size = base_size + data_size + indices_size + indptr_size
    return total_size
