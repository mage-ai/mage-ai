import json
from typing import Dict, List

from mage_integrations.destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
)
from mage_integrations.destinations.snowflake.constants import (
    SNOWFLAKE_COLUMN_TYPE_VARIANT,
)
from mage_integrations.destinations.sql.utils import (
    clean_column_name,
    convert_column_to_type,
)
from mage_integrations.destinations.sql.utils import (
    convert_column_type as convert_column_type_og,
)
from mage_integrations.utils.strings import is_number


def build_alter_table_command(
    column_type_mapping: Dict,
    columns: List[str],
    full_table_name: str,
    column_identifier: str = '',
    use_lowercase: bool = True,
) -> str:
    if not columns:
        return None

    columns_and_types = [
        f"{column_identifier}{clean_column_name(col, use_lowercase)}{column_identifier}" +
        f" {column_type_mapping[col]['type_converted']}" for col
        in columns
    ]
    # TODO: support add new unique constraints
    return f"ALTER TABLE {full_table_name} ADD {', '.join(columns_and_types)}"


def convert_column_type(column_type: str, column_settings: Dict, **kwargs) -> str:
    if COLUMN_TYPE_OBJECT == column_type:
        return 'VARIANT'
    elif COLUMN_TYPE_ARRAY == column_settings.get('type_converted') or \
            COLUMN_TYPE_ARRAY == column_type:
        return 'ARRAY'
    elif COLUMN_TYPE_STRING == column_type \
            and COLUMN_FORMAT_DATETIME == column_settings.get('format'):
        return 'TIMESTAMP'
    elif COLUMN_TYPE_STRING == column_type:
        return 'VARCHAR'

    return convert_column_type_og(column_type, column_settings)


def convert_array(value, column_settings):
    def format_value(val):
        val_str = str(val)
        if type(val) is list or type(val) is dict:
            return f"'{json.dumps(val)}'"
        elif is_number(val_str):
            return val_str
        else:
            val_str = val_str.replace("'", "\\'")
            return f"'{val_str}'"

    if type(value) is list and value:
        value_string = ', '.join([format_value(i) for i in value])
        return f'({value_string})'

    return 'NULL'


def convert_column_if_json(value, column_type):
    if SNOWFLAKE_COLUMN_TYPE_VARIANT == column_type:
        value = (
            value.
            replace('\\n', '\\\\n').
            encode('unicode_escape').
            decode().
            replace("'", "\\'").
            replace('\\"', '\\\\"')
        )
        # Arrêté N°2018-61
        # Arr\u00eat\u00e9 N\u00b02018-61
        # b'Arr\\xeat\\xe9 N\\xb02018-61'
        # Arr\\xeat\\xe9 N\\xb02018-61

        return f"'{value}'"

    return convert_column_to_type(value, column_type)
