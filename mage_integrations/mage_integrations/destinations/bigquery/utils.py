from mage_integrations.destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
)
from mage_integrations.destinations.sql.utils import convert_column_type as convert_column_type_orig
from typing import Dict
import json


def replace_single_quotes_with_double(v: str) -> str:
    if type(v) is dict:
        v = json.dumps(v)
    return v.replace("'", '"')

def convert_array(value: str, column_type_dict: Dict) -> str:
    item_type_converted = column_type_dict['item_type_converted']

    value_next = []

    if 'JSON' == item_type_converted:
        if type(value) is list:
            value_next = [f"'{replace_single_quotes_with_double(v)}'" for v in value]
        else:
            value_next = [f"'{replace_single_quotes_with_double(value)}'"]

        arr_string = ', '.join([f'TO_JSON({v})' for v in value_next])

        return f'[{arr_string}]'

    column_settings = column_type_dict['column_settings']

    if type(value) is list:
        value_next = [f"CAST('{replace_single_quotes_with_double(v)}' AS {item_type_converted})" for v in value]
    else:
        value_next = [f"CAST('{replace_single_quotes_with_double(value)}' AS {item_type_converted})"]

    arr_string = ', '.join([str(v) for v in value_next])

    return f'[{arr_string}]'


def convert_column_type(
    column_type: str,
    column_settings: Dict,
    **kwargs,
) -> str:
    if COLUMN_TYPE_OBJECT == column_type:
        return 'JSON'
    elif COLUMN_TYPE_STRING == column_type \
        and COLUMN_FORMAT_DATETIME == column_settings.get('format'):

        return 'DATETIME'

    return convert_column_type_orig(column_type, column_settings, **kwargs)


def convert_column_to_type(value, column_type) -> str:
    value = value.replace("'", "\\'")
    return f"CAST('{value}' AS {column_type})"


def convert_datetime(value: str, column_type_dict: Dict) -> str:
    column_type_converted = column_type_dict['type_converted']
    parts = value.split('.')
    arr = parts
    if len(parts) >= 2:
        arr = parts[:-1]
        tz = parts[-1][:3]
        arr.append(tz)

    return convert_column_to_type('.'.join(arr), column_type_converted)


def convert_converted_type_to_parameter_type(converted_type):
    """
    https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.query.ScalarQueryParameterType

    converted_type: one of
        'BIGINT'
        'BOOLEAN'
        'DATETIME'
        'FLOAT64'
        'JSON'
        'STRING'
        'TEXT'

        If there is a column of these types, the raw value will be used in the insert command
        instead of using a query parameter:
            'ARRAY'
            'BOOLEAN'
            'DATETIME'
            'JSON'
            'TEXT'

    Returns one of
        'BOOL'
        'DATE'
        'DATETIME'
        'FLOAT64'
        'INT64'
        'NUMERIC'
        'STRING'
        'TIMESTAMP'

    """
    if 'BIGINT' == converted_type:
        return 'INT64'

    return converted_type
