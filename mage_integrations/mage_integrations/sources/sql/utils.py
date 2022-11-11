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
):
    column_type = find(lambda x: COLUMN_TYPE_NULL != x, properties.get(col)['type'])
    col_type = column_type_mapping(column_type)

    return f"{col} {operator} CAST('{val}' AS {col_type})"


def column_type_mapping(column_type: str) -> str:
    if COLUMN_TYPE_BOOLEAN == column_type:
        return 'BOOL'
    elif COLUMN_TYPE_INTEGER == column_type:
        return 'BIGINT'
    elif COLUMN_TYPE_NUMBER == column_type:
        return 'DECIMAL'
    elif COLUMN_TYPE_OBJECT == column_type:
        return 'TEXT'

    return 'CHAR'
