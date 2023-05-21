import json
from typing import Dict, List

from mage_integrations.destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
)
from mage_integrations.destinations.sql.utils import (
    convert_column_type as convert_column_type_orig,
)


def escape_quotes(line: str, single: bool = True, double: bool = True) -> str:
    new_line = str(line)
    if single:
        new_line = new_line.replace("'", "''")
    if double:
        new_line = new_line.replace('\"', '\\"')
    return new_line


def convert_array(v: List, column_type_dict: Dict):
    item_type_converted = column_type_dict['item_type_converted']

    if 'JSONB' == item_type_converted.upper():
        arr = []
        for v2 in v:
            if v2:
                if type(v2) is dict:
                    v2 = json.dumps(v2)
            arr.append(v2)
        arr_joined = ', '.join([f"'{escape_quotes(v2, double=False)}'" for v2 in arr])
        value_final = f"ARRAY[{arr_joined}]::JSONB[]"
    else:
        value_final = [escape_quotes(s) for s in v]
        strings_joined = ', '.join(value_final)
        value_final = f"'{{{strings_joined}}}'"

    return value_final


def convert_column_type(
    column_type: str,
    column_settings: Dict,
    **kwargs,
) -> str:
    if COLUMN_TYPE_OBJECT == column_type:
        return 'JSONB'
    elif COLUMN_TYPE_STRING == column_type \
            and COLUMN_FORMAT_DATETIME == column_settings.get('format'):
        return 'TIMESTAMPTZ'

    return convert_column_type_orig(column_type, column_settings, **kwargs)
