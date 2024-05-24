import os
from pathlib import Path
from typing import Callable, Dict, List, Optional

import polars as pl

from mage_ai.settings.server import SYSTEM_LOGS_PARTITIONS
from mage_ai.system.constants import LogType
from mage_ai.system.memory.constants import MEMORY_DIRECTORY
from mage_ai.system.memory.utils import get_log_directory

DEFAULT_SCHEMA = {
    'block_uuid': pl.Utf8,
    'log_type': pl.Utf8,
    'message': pl.Utf8,
    'metadata': pl.Utf8,
    'metric': pl.Utf8,
    'pipeline_uuid': pl.Utf8,
    'process_uuid': pl.Utf8,
    'scope_uuid': pl.Utf8,
    'timestamp': pl.Int64,
    'value': pl.Float64,
}


def parse_line(line: str) -> dict:
    # Initial parsing by removing brackets and splitting
    parts = line.strip('[]').split(']', 1)
    timestamp = parts[0]
    rest = parts[1].strip() if len(parts) > 1 else ''

    data = {}
    for k in DEFAULT_SCHEMA.keys():
        if k not in ['timestamp', 'value']:
            data[k] = None
    data['timestamp'] = int(timestamp)
    data['value'] = float('nan')

    # Extract the log type and the rest
    if rest:
        segments = rest.split(' ', 2)  # Expecting type, potential message, and metadata
        log_type = segments[0].replace('[', '').replace(']', '')
        data['log_type'] = log_type

        # The rest could contain a message and/or metadata
        rest_segments = ' '.join(segments[1:]).split('=', 1)

        message = None
        if len(rest_segments) > 1:  # There's metadata
            # Attempt to identify potential message before metadata
            pre_meta = rest_segments[0].rpartition(' ')

            message = pre_meta[0].strip()
            # Reconstruct metadata split and parse
            metadata_content = pre_meta[2] + '=' + rest_segments[1]
            data['metadata'] = metadata_content
        else:
            # No metadata, the rest could be a message
            message = rest_segments[0].strip()

        data['message'] = message
        if LogType.MEMORY.value == log_type:
            data['metric'] = LogType.MEMORY.value
            if message.isdigit():
                data['value'] = float(message)

    return data


def parse_log_to_polars(log_contents: str, process_uuid: str) -> pl.DataFrame:
    data_records: List[dict] = []
    lines = log_contents.strip().split('\n')

    for line in lines:
        log_data = parse_line(line)
        log_data['process_uuid'] = process_uuid  # Add process_uuid to each log data record
        data_records.append(log_data)

    return pl.DataFrame(data_records)


def parse_directory_to_df(
    directory_path: str, extra_columns_parser: Optional[Callable[[str, str], dict]] = None
) -> pl.DataFrame:
    """
    Parses a directory of log files into a Polars DataFrame.

    Parameters:
    - directory_path: Path to the directory containing log files.
    - extra_columns_parser: [Optional] A callable function that receives the file path of
        each log and returns a dictionary of extra columns and their values.

    Returns:
    - A Polars DataFrame containing the merged logs with potential extra columns.
    """
    all_dataframes = []
    for root, _dirs, files in os.walk(directory_path):
        for file_name in files:
            if file_name.endswith('.log'):
                process_uuid = file_name.replace('.log', '')
                file_path = os.path.join(root, file_name)
                with open(file_path, 'r') as file:
                    log_contents = file.read()
                    df = parse_log_to_polars(log_contents, process_uuid)

                    extra_columns = pipeline_block_columns_parser(directory_path, file_path)

                    if extra_columns_parser:
                        extra_columns.update(extra_columns_parser(directory_path, file_path) or {})

                    if extra_columns:
                        for col, val in extra_columns.items():
                            df = df.with_columns((pl.lit(val)).alias(col))

                    all_dataframes.append(df)

    if all_dataframes:
        final_df = pl.concat(all_dataframes)
        return final_df
    else:
        return pl.DataFrame(
            [],
            schema=DEFAULT_SCHEMA,
        )


def to_dataframe(
    scope_uuid: str, extra_columns_parser: Optional[Callable[[str, str], dict]] = None
) -> pl.DataFrame:
    log_directory = get_log_directory(scope_uuid)
    return parse_directory_to_df(
        log_directory,
        extra_columns_parser=extra_columns_parser,
    )


def pipeline_block_columns_parser(directory_path: str, file_path: str) -> Dict:
    try:
        parts = Path(file_path).relative_to(Path(directory_path)).parts
        if MEMORY_DIRECTORY in parts:
            parts = parts[: parts.index(MEMORY_DIRECTORY)]

        parts = parts[: -1 * len(SYSTEM_LOGS_PARTITIONS)]

        data = {}

        # If the pipeline is in the directory path, there won’t be a pipeline UUID in the parts
        if len(parts) >= 1:
            data['scope_uuid'] = os.path.join(*parts)
            if len(parts) >= 2:
                data['pipeline_uuid'] = os.path.join(*parts[:1])
                data['block_uuid'] = os.path.join(*parts[1:])
            else:
                data['block_uuid'] = os.path.join(*parts)

        return data
    except ValueError:
        return {}
