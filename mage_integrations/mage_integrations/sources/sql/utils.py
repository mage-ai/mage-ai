from mage_integrations.sources.constants import COLUMN_TYPE_NULL
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
