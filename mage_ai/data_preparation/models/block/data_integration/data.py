import io
import json
import math
import os
from typing import Any, Callable, Dict, List, Union

import pandas as pd
import simplejson

from mage_ai.data_preparation.models.block.data_integration.constants import (
    OUTPUT_TYPE_RECORD,
)
from mage_ai.data_preparation.models.pipelines.utils import number_string
from mage_ai.shared.parsers import encode_complex

CHUNK_SIZE_BUFFER_PERCENTAGE = 0.1


def convert_dataframe_to_output(
    df: pd.DataFrame,
    stream: str,
    chunk_size: int = None,
    dir_path: str = None,
    io_buffer: Union[io.StringIO, Any] = None,
    log_message: Callable = None,
    schema: Dict = None,
) -> List[str]:
    records = df.to_dict('records')

    def _output(record, stream=stream):
        text = simplejson.dumps(
            dict(
                record=record,
                stream=stream,
                type=OUTPUT_TYPE_RECORD,
            ),
            default=encode_complex,
            ignore_nan=True,
        )
        return f'{text}\n'

    output_file_paths = []

    # Generate 1 row and calculate how many bytes that 1 row is and give a 10% buffer
    # (so store only 90% before moving on).
    if dir_path:
        os.makedirs(dir_path, exist_ok=True)

        records_count = len(records)
        if records_count == 0:
            return

        if chunk_size:
            sample_byte_size = len(_output(records[0]).encode('utf-8'))
            records_per_file = math.floor(
                (chunk_size * (1 - CHUNK_SIZE_BUFFER_PERCENTAGE)) / sample_byte_size,
            )
        else:
            records_per_file = records_count

        batches = math.ceil(records_count / records_per_file)

        for index in range(batches):
            start_index = index * records_per_file
            end_index = (index + 1) * records_per_file
            records_in_batch = records[start_index:end_index]
            file_path = os.path.join(dir_path, number_string(index))

            with open(file_path, 'w') as f:
                if schema:
                    f.write(f'{json.dumps(schema)}\n')

                for record in records_in_batch:
                    f.write(_output(record))

            if log_message:
                log_message(
                    f'Writing {len(records_in_batch)} records from stream {stream} to {file_path} '
                    f'for batch index {index} ({index + 1} out of {batches} batch(s)).',
                )

            output_file_paths.append(file_path)
    elif io_buffer:
        if schema:
            io_buffer.write(f'{json.dumps(schema)}\n')

        for record in records:
            io_buffer.write(_output(record))

    return output_file_paths
