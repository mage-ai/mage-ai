from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
)
from mage_integrations.utils.array import find
from typing import Any, Callable, Dict


def build_comparison_statement(
    col: str,
    val: Any,
    properties: Dict,
    operator: str = '=',
    column_cleaned: str = None,
    convert_datetime_func: Callable = None,
):
    column_properties = properties.get(col)
    if not column_properties:
        raise Exception(
            f'There are no properties in the schema for column {col}.')

    column_type = find(
        lambda x: COLUMN_TYPE_NULL != x,
        column_properties['type']
    )
    column_format = column_properties.get('format')

    convert_func = column_func(column_type)

    if column_format == COLUMN_FORMAT_DATETIME \
            and convert_datetime_func is not None:
        val = convert_datetime_func(val)

    return (
        f"{column_cleaned if column_cleaned else col} "
        f"{operator} {convert_func}('{val}')"
    )


def column_func(column_type: str) -> str:
    if COLUMN_TYPE_BOOLEAN == column_type:
        return 'TOBOOLEAN'
    elif COLUMN_TYPE_INTEGER == column_type:
        return 'TONUMBER'
    elif COLUMN_TYPE_NUMBER == column_type:
        return 'TONUMBER'

    return 'TOSTRING'


def wrap_column_in_quotes(column):
    if "`" not in column:
        return f'`{column}`'

    return column
