import json
from ast import literal_eval
from typing import Callable, Dict, List

from mage_integrations.destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
)
from mage_integrations.destinations.sql.constants import SQL_RESERVED_WORDS_SUBSET
from mage_integrations.destinations.utils import (
    clean_column_name as clean_column_name_orig,
)


def clean_column_name(
        col,
        lower_case: bool = True,
        allow_reserved_words: bool = False
):
    col_new = clean_column_name_orig(col, lower_case=lower_case)
    if allow_reserved_words is False and col_new.upper() in SQL_RESERVED_WORDS_SUBSET:
        col_new = f'_{col_new}'
    return col_new


def build_create_table_command(
    column_type_mapping: Dict,
    columns: List[str],
    full_table_name: str,
    location: str = None,
    unique_constraints: List[str] = None,
    create_temporary_table: bool = False,
    column_identifier: str = '',
    if_not_exists: bool = False,
    key_properties: List[str] = None,
    use_lowercase: bool = True,
    allow_reserved_words: bool = False,
) -> str:
    columns_and_types = [
        f"{column_identifier}{clean_column_name(col, use_lowercase, allow_reserved_words)}" +
        f"{column_identifier}" +
        f" {column_type_mapping[col]['type_converted']}"
        for col in columns
    ]

    if unique_constraints:
        unique_constraints_clean = [clean_column_name(col, use_lowercase, allow_reserved_words)
                                    for col in unique_constraints]

        unique_constraints_escaped = [f'{column_identifier}{col}{column_identifier}'
                                      for col in unique_constraints_clean]

        index_name = '_'.join([
            clean_column_name(full_table_name, use_lowercase, allow_reserved_words),
        ] + unique_constraints_clean)
        index_name = f'unique{index_name}'[:64]
        columns_and_types.append(
            f"CONSTRAINT {index_name} UNIQUE ({', '.join(unique_constraints_escaped)})",
        )

    if key_properties and len(key_properties) >= 1:
        key_properties_clean = [
            f'{column_identifier}{clean_column_name(col, use_lowercase, allow_reserved_words)}' +
            f'{column_identifier}'
            for col in key_properties
        ]
        columns_and_types.append(f"PRIMARY KEY ({', '.join(key_properties_clean)})")

    if_not_exists_command = ''
    if if_not_exists:
        if_not_exists_command = ' IF NOT EXISTS'

    if location is not None:
        table_properties = f"WITH (location = '{location}')"
    else:
        table_properties = ''
    return f"CREATE {'TEMP ' if create_temporary_table else ''}TABLE"\
           f"{if_not_exists_command} {full_table_name} ({', '.join(columns_and_types)})"\
           f"{table_properties}"


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
        f"ADD COLUMN {column_identifier}{clean_column_name(col, use_lowercase, allow_reserved_words)}{column_identifier}" + # noqa
        f" {column_type_mapping[col]['type_converted']}" for col
        in columns
    ]
    # TODO: support add new unique constraints
    return f"ALTER TABLE {full_table_name} {', '.join(columns_and_types)}"


def convert_column_type(
    column_type: str,
    column_settings: Dict,
    number_type: str = 'DOUBLE PRECISION',
    string_type: str = 'VARCHAR',
) -> str:
    if COLUMN_TYPE_BOOLEAN == column_type:
        return 'BOOLEAN'
    elif COLUMN_TYPE_INTEGER == column_type:
        return 'BIGINT'
    elif COLUMN_TYPE_NUMBER == column_type:
        return number_type
    elif COLUMN_TYPE_OBJECT == column_type:
        return 'TEXT'
    elif COLUMN_TYPE_STRING == column_type:
        if COLUMN_FORMAT_DATETIME == column_settings.get('format'):
            # Twice as long as the number of characters in ISO date format
            return 'VARCHAR(52)' if string_type == 'VARCHAR' else string_type
        else:
            return 'VARCHAR(255)' if string_type == 'VARCHAR' else string_type


def column_type_mapping(
    schema: Dict,
    convert_column_type_func: Callable,
    convert_array_column_type_func: Callable,
    number_type: str = 'DOUBLE PRECISION',
    string_type: str = 'VARCHAR',
) -> Dict:
    mapping = {}
    for column, column_settings in schema['properties'].items():
        arr = column_settings.get('type', [])
        column_types_for_array_type = []

        if type(arr) is not list:
            arr = [arr]

        for any_of in column_settings.get('anyOf', []):
            if 'format' not in column_settings and 'format' in any_of:
                column_settings['format'] = any_of['format']

            arr2 = any_of.get('type', [])
            if type(arr2) is not list:
                arr2 = [arr2]

            any_of_items = any_of.get('items', {})
            if any_of_items:
                if type(any_of_items) is not list:
                    any_of_items = [any_of_items]
                for aoi in any_of_items:
                    aoi_type = aoi.get('type')
                    if aoi_type:
                        if type(aoi_type) is list:
                            column_types_for_array_type += aoi_type
                        else:
                            column_types_for_array_type.append(aoi_type)

            arr += arr2

        column_types = [t for t in arr if 'null' != t]

        column_type = column_types[0]
        if COLUMN_TYPE_ARRAY == column_type and len(column_types) >= 2:
            column_type = column_types[1]

        if string_type == 'VARCHAR':
            column_type_converted = 'VARCHAR(255)'
        else:
            column_type_converted = string_type
        item_type = None
        item_type_converted = None

        if COLUMN_TYPE_ARRAY == column_type:
            item_types = [ct for ct in column_types_for_array_type if 'null' != ct]
            items_types = column_settings.get('items', {}).get('type', [])
            if type(items_types) is not list:
                items_types = [items_types]
            item_types += [t for t in items_types if 'null' != t and 'array' != t]

            items_items = column_settings.get('items', {}).get('items', {}).get('type', [])
            if len(items_items) >= 1:
                item_types += items_items

            if len(item_types):
                item_type = item_types[0]
                item_type_converted = convert_column_type_func(
                    item_type,
                    column_settings,
                    number_type=number_type,
                    string_type=string_type,
                )

                column_type_converted = convert_array_column_type_func(item_type_converted)
            else:
                column_type_converted = convert_column_type_func(
                    column_type,
                    column_settings,
                    number_type=number_type,
                    string_type=string_type,
                )

            if not item_type_converted:
                if string_type == 'VARCHAR':
                    item_type_converted = 'VARCHAR(255)'
                else:
                    item_type_converted = string_type
        else:
            column_type_converted = convert_column_type_func(
                column_type,
                column_settings,
                number_type=number_type,
                string_type=string_type,
            )

        if not column_type_converted:
            if string_type == 'VARCHAR':
                column_type_converted = 'VARCHAR(255)'
            else:
                column_type_converted = string_type

        mapping[column] = dict(
            column_settings=column_settings,
            item_type=item_type,
            item_type_converted=item_type_converted,
            type=column_type,
            type_converted=column_type_converted,
        )

    return mapping


def convert_column_to_type(value, column_type) -> str:
    return f"CAST('{value}' AS {column_type})"


def build_insert_columns(
    columns: List[str],
    column_identifier: str = '',
    use_lowercase: bool = True,
    allow_reserved_words: bool = False,
):
    return [f'{column_identifier}{clean_column_name(col, use_lowercase, allow_reserved_words)}' +
            f'{column_identifier}'
            for col in columns]


def build_insert_command(
    column_type_mapping: Dict,
    columns: List[str],
    records: List[Dict],
    convert_array_func: Callable = None,
    convert_column_to_type_func: Callable = convert_column_to_type,
    convert_datetime_func: Callable = None,
    string_parse_func: Callable = None,
    stringify_values: bool = True,
    convert_column_types: bool = True,
    column_identifier: str = '',
    use_lowercase: bool = True,
    allow_reserved_words: bool = False,
) -> List[str]:
    values = []
    for row in records:
        vals = []
        for column in columns:
            v = row.get(column, None)

            column_type_dict = column_type_mapping[column]
            column_type = column_type_dict['type']
            column_type_converted = column_type_dict['type_converted']
            column_settings = column_type_dict['column_settings']

            value_final = 'NULL'
            if v is not None:
                if COLUMN_TYPE_ARRAY == column_type:
                    if type(v) is str:
                        v = literal_eval(v)

                    if convert_array_func:
                        value_final = convert_array_func(v, column_type_dict)
                    else:
                        value_final = [str(s).replace("'", "''") for s in v]
                        value_final = f"'{{{', '.join(value_final)}}}'"
                elif COLUMN_FORMAT_DATETIME == column_settings.get('format') \
                        and convert_datetime_func:
                    value_final = convert_datetime_func(v, column_type_dict)
                else:
                    if type(v) is dict or type(v) is list:
                        value_final = json.dumps(v)
                    else:
                        value_final = str(v).replace("'", "''")

                    if string_parse_func:
                        value_final = string_parse_func(value_final, column_type_dict)

                    if convert_column_types:
                        value_final = convert_column_to_type_func(
                            value_final,
                            column_type_converted,
                        )

            vals.append(value_final)
        if stringify_values:
            vals = f"({', '.join(vals)})"
        values.append(vals)

    return [
        build_insert_columns(columns,
                             column_identifier=column_identifier,
                             use_lowercase=use_lowercase,
                             allow_reserved_words=allow_reserved_words),
        values,
    ]
