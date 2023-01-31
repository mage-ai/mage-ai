from mage_integrations.sources.constants import (
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
)
from mage_integrations.utils.array import find
from typing import Any, Callable, Dict


def build_comparison_statement(
    col: str,
    val: Any,
    properties: Dict,
    column_type_mapping: Callable,
    operator: str = '=',
    column_cleaned: str = None,
):
    column_properties = properties.get(col)
    if not column_properties:
        raise Exception(f'There are no properties in the schema for column {col}.')

    column_type = find(lambda x: COLUMN_TYPE_NULL != x, column_properties['type'])
    column_format = column_properties.get('format')
    col_type = column_type_mapping(column_type, column_format)

    return f"{column_cleaned if column_cleaned else col} {operator} CAST('{val}' AS {col_type})"


def column_type_mapping(column_type: str, column_format: str = None) -> str:
    if COLUMN_TYPE_BOOLEAN == column_type:
        return 'BOOL'
    elif COLUMN_TYPE_INTEGER == column_type:
        return 'BIGINT'
    elif COLUMN_TYPE_NUMBER == column_type:
        return 'DECIMAL'
    elif COLUMN_TYPE_OBJECT == column_type:
        return 'TEXT'

    return 'VARCHAR'


def wrap_column_in_quotes(column):
    if "'" not in column and '"' not in column:
        return f'"{column}"'

    return column
