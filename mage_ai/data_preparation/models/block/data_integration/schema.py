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
    OUTPUT_TYPE_SCHEMA,
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
    TEXT,
    TRUE_OR_FALSE,
    ZIP_CODE,
    infer_column_types,
)

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


def build_schema(df: pd.DataFrame, stream: str) -> Dict:
    column_types = infer_column_types(df)

    properties = {}

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

    return dict(
        schema=dict(
            properties=properties,
            type=TYPE_OBJECT,
        ),
        stream=stream,
        type=OUTPUT_TYPE_SCHEMA,
    )
