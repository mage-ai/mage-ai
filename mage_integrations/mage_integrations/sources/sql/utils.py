from typing import Any, Callable, Dict, Union

from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
)
from mage_integrations.sources.sql.constants import PredicateOperator
from mage_integrations.utils.array import find


def build_comparison_statement(
    col: str,
    val: Any,
    properties: Dict,
    column_type_mapping: Callable,
    operator: str = '=',
    column_cleaned: str = None,
    convert_datetime_func: Callable = None,
):
    column_properties = properties.get(col)
    if not column_properties:
        raise Exception(f'There are no properties in the schema for column {col}.')

    column_type = find(lambda x: COLUMN_TYPE_NULL != x, column_properties['type'])
    column_format = column_properties.get('format')
    col_type = column_type_mapping(column_type, column_format)

    if column_format == COLUMN_FORMAT_DATETIME and convert_datetime_func is not None:
        val = convert_datetime_func(val)

    if col_type:
        comparison_value = f"CAST('{val}' AS {col_type})"
    else:
        comparison_value = f"'{val}'"
    return f"{column_cleaned if column_cleaned else col} {operator} {comparison_value}"


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


def predicate_operator_uuid_to_comparison_operator(operator: Union[PredicateOperator, str]) -> str:
    if isinstance(operator, str):
        operator = PredicateOperator(operator)

    if PredicateOperator.EQUALS == operator:
        return '='
    if PredicateOperator.GREATER_THAN == operator:
        return '>'
    if PredicateOperator.GREATER_THAN_OR_EQUALS == operator:
        return '>='
    if PredicateOperator.LESS_THAN == operator:
        return '<'
    if PredicateOperator.LESS_THAN_OR_EQUALS == operator:
        return '<='
    if PredicateOperator.NOT_EQUALS == operator:
        return '!='
