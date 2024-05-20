import os
from typing import List

import polars as pl

from mage_ai.system.memory.utils import get_log_directory


def parse_line(line: str) -> dict:
    # Initial parsing by removing brackets and splitting
    parts = line.strip('[]').split(']', 1)
    timestamp = parts[0]
    rest = parts[1].strip() if len(parts) > 1 else ''

    data = {'timestamp': timestamp, 'log_type': None, 'message': None, 'metadata': None}

    # Extract the log type and the rest
    if rest:
        segments = rest.split(' ', 2)  # Expecting type, potential message, and metadata
        data['log_type'] = segments[0].replace('[', '').replace(']', '')

        # The rest could contain a message and/or metadata
        rest_segments = ' '.join(segments[1:]).split('=', 1)

        if len(rest_segments) > 1:  # There's metadata
            # Attempt to identify potential message before metadata
            pre_meta = rest_segments[0].rpartition(' ')
            data['message'] = pre_meta[0].strip()
            # Reconstruct metadata split and parse
            metadata_content = pre_meta[2] + '=' + rest_segments[1]
            data['metadata'] = metadata_content
        else:
            # No metadata, the rest could be a message
            data['message'] = rest_segments[0].strip()

    return data


def parse_log_to_polars(log_contents: str, process_uuid: str) -> pl.DataFrame:
    data_records: List[dict] = []
    lines = log_contents.strip().split('\n')

    for line in lines:
        log_data = parse_line(line)
        log_data['process_uuid'] = process_uuid  # Add process_uuid to each log data record
        data_records.append(log_data)

    return pl.DataFrame(data_records)


def parse_directory_to_df(directory_path: str) -> pl.DataFrame:
    all_dataframes = []
    for root, dirs, files in os.walk(directory_path):
        for file_name in files:
            if file_name.endswith('.log'):
                process_uuid = file_name.replace('.log', '')
                file_path = os.path.join(root, file_name)
                with open(file_path, 'r') as file:
                    log_contents = file.read()
                    df = parse_log_to_polars(log_contents, process_uuid)
                    all_dataframes.append(df)

    if all_dataframes:
        final_df = pl.concat(all_dataframes)
        # To convert metadata back into a dictionary when needed:
        # final_df = final_df.with_column(pl.col('metadata').apply(json.loads).alias('metadata'))
        return final_df
    else:
        return pl.DataFrame(
            [],
            schema={
                'process_uuid': pl.Utf8,
                'timestamp': pl.Utf8,
                'log_type': pl.Utf8,
                'message': pl.Utf8,
                'metadata': pl.Utf8,
            },
        )


def to_dataframe(scope_uuid: str) -> pl.DataFrame:
    log_directory = get_log_directory(scope_uuid)
    return parse_directory_to_df(log_directory)
