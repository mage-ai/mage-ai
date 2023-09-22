import io
import json
from typing import Any, Dict, Union

import pandas as pd

from mage_ai.data_preparation.models.block.data_integration.constants import (
    OUTPUT_TYPE_RECORD,
)


def convert_dataframe_to_output(
    df: pd.DataFrame,
    stream: str,
    file_path: str = None,
    io_buffer: Union[io.StringIO, Any] = None,
    schema: Dict = None,
):
    records = df.to_dict('records')

    def _output(record, stream=stream):
        text = json.dumps(dict(
            record=record,
            stream=stream,
            type=OUTPUT_TYPE_RECORD,
        ))
        return f'{text}\n'

    if file_path:
        with open(file_path, 'w') as f:
            if schema:
                f.write(f'{json.dumps(schema)}\n')

            for record in records:
                f.write(_output(record))
    elif io_buffer:
        if schema:
            io_buffer.write(f'{json.dumps(schema)}\n')

        for record in records:
            io_buffer.write(_output(record))
