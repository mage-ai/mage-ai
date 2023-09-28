import re
from datetime import datetime
from typing import Dict

import pandas as pd

from mage_ai.data_preparation.models.block.data_integration.constants import (
    COLUMN_SCHEMA_DATETIME,
    COLUMN_SCHEMA_UUID,
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    KEY_REPLICATION_METHOD,
    OUTPUT_TYPE_SCHEMA,
    REPLICATION_METHOD_FULL_TABLE,
    TYPE_OBJECT,
)
from mage_ai.shared.column_type_detector import (
    CATEGORY,
    CATEGORY_HIGH_CARDINALITY,
    DATETIME,
    EMAIL,
    NUMBER,
    NUMBER_WITH_DECIMALS,
    PHONE_NUMBER,
    REGEX_DATETIME_PATTERN,
    TEXT,
    TRUE_OR_FALSE,
    ZIP_CODE,
    infer_column_types,
)
from mage_ai.shared.hash import merge_dict

COLUMN_TYPE_TO_CONVERTED_TYPE_MAPPING = {
    # Array is not yet detected
    COLUMN_TYPE_ARRAY: COLUMN_TYPE_ARRAY,
    # Object is not yet detected
    COLUMN_TYPE_OBJECT: COLUMN_TYPE_OBJECT,
    CATEGORY: COLUMN_TYPE_STRING,
    CATEGORY_HIGH_CARDINALITY: COLUMN_TYPE_STRING,
    NUMBER: COLUMN_TYPE_INTEGER,
    NUMBER_WITH_DECIMALS: COLUMN_TYPE_NUMBER,
    PHONE_NUMBER: COLUMN_TYPE_STRING,
    TEXT: COLUMN_TYPE_STRING,
    TRUE_OR_FALSE: COLUMN_TYPE_BOOLEAN,
    ZIP_CODE: COLUMN_TYPE_STRING,
}

COLUMN_TYPE_TO_CONVERTED_TYPE_MAPPING_PYTHON = {
    'bool': COLUMN_TYPE_BOOLEAN,
    'dict': COLUMN_TYPE_OBJECT,
    'float': COLUMN_TYPE_NUMBER,
    'int': COLUMN_TYPE_INTEGER,
    'list': COLUMN_TYPE_ARRAY,
    'str': COLUMN_TYPE_STRING,
}


def build_schema(
    df: pd.DataFrame,
    stream: str,
    strict: bool = False,
    schema_override: Dict = None,
) -> Dict:
    column_types = infer_column_types(df)

    properties = {}

    if strict:
        for column, column_type in column_types.items():
            if DATETIME == column_type:
                props = COLUMN_SCHEMA_DATETIME
            elif EMAIL == column_type:
                props = COLUMN_SCHEMA_UUID
            else:
                converted_type = COLUMN_TYPE_STRING
                if column_type in COLUMN_TYPE_TO_CONVERTED_TYPE_MAPPING:
                    converted_type = COLUMN_TYPE_TO_CONVERTED_TYPE_MAPPING[column_type]

                props = dict(
                    type=[
                        COLUMN_TYPE_NULL,
                        converted_type,
                    ],
                )

                properties[column] = props
    else:
        rows = df.iloc[:100].to_numpy()
        for idx, column in enumerate(df.columns):
            column_values = rows[:, idx]
            column_type_grouped = {}
            for val in column_values:
                col_type = type(val)
                if val and col_type is str and re.match(REGEX_DATETIME_PATTERN, val):
                    col_type = datetime

                key = col_type.__name__
                if key not in column_type_grouped:
                    column_type_grouped[key] = 0

                column_type_grouped[key] += 1

            column_type, _column_type_count = sorted(
                column_type_grouped.items(),
                key=lambda x: x[1],
                reverse=True,
            )[0]

            if 'datetime' == column_type:
                props = COLUMN_SCHEMA_DATETIME
            else:
                converted_type = COLUMN_TYPE_STRING
                if column_type in COLUMN_TYPE_TO_CONVERTED_TYPE_MAPPING_PYTHON:
                    converted_type = COLUMN_TYPE_TO_CONVERTED_TYPE_MAPPING_PYTHON[column_type]

                props = dict(
                    type=[
                        COLUMN_TYPE_NULL,
                        converted_type,
                    ],
                )

            properties[column] = props

    metadata_arr = [
        dict(
            breadcrumb=[],
            metadata=dict(
                selected=True,
            ),
        ),
    ]

    for column in properties.keys():
        metadata_arr.append(dict(
            breadcrumb=[
                'properties',
                column,
            ],
            metadata=dict(
                inclusion='available',
                selected=True,
            ),
        ))

    return merge_dict({
        'metadata': metadata_arr,
        'schema': dict(
            properties=properties,
            type=TYPE_OBJECT,
        ),
        'stream': stream,
        'type': OUTPUT_TYPE_SCHEMA,
        KEY_REPLICATION_METHOD: REPLICATION_METHOD_FULL_TABLE,
    }, schema_override)
