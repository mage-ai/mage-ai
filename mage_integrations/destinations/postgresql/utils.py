from ast import literal_eval
from mage_integrations.destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_ARRAY,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from mage_integrations.destinations.utils import clean_column_name
from typing import Dict, List


def convert_column_type(column_type: str, column_settings: Dict) -> str:
    if COLUMN_TYPE_BOOLEAN == column_type:
        return 'BOOLEAN'
    elif COLUMN_TYPE_INTEGER == column_type:
        return 'BIGINT'
    elif COLUMN_TYPE_NUMBER == column_type:
        return 'DOUBLE PRECISION'
    elif COLUMN_TYPE_OBJECT == column_type:
        return 'TEXT'
    elif COLUMN_TYPE_STRING == column_type:
        if COLUMN_FORMAT_DATETIME == column_settings.get('format'):
            # Twice as long as the number of characters in ISO date format
            return 'VARCHAR(52)'
        else:
            return 'VARCHAR(255)'

def column_type_mapping(schema) -> dict:
    mapping = {}
    for column, column_settings in schema['properties'].items():
        arr = column_settings.get('type', [])

        if type(arr) is not list:
            arr = [arr]

        for any_of in column_settings.get('anyOf', []):
            arr2 = any_of.get('type', [])
            if type(arr2) is not list:
                arr2 = [arr2]
            arr += arr2

        column_types = [t for t in arr if 'null' != t]

        column_type = column_types[0]
        if COLUMN_TYPE_ARRAY == column_type and len(column_types) >= 2:
            column_type = column_types[1]

        column_type_converted = 'VARCHAR(255)'
        item_type = None
        item_type_converted = None

        if COLUMN_TYPE_ARRAY == column_type:
            item_types = [t for t in column_settings.get('items', {}).get('type', []) if 'null' != t]
            if len(item_types):
                item_type = item_types[0]
                item_type_converted = convert_column_type(item_type, column_settings)
                column_type_converted = f'{item_type_converted}[]'
        else:
            column_type_converted = convert_column_type(column_type, column_settings)

        mapping[column] = dict(
            item_type=item_type,
            item_type_converted=item_type_converted,
            type=column_type,
            type_converted=column_type_converted,
        )

    return mapping


def convert_column_to_type(value, column_type):
    return f"CAST('{value}' AS {column_type})"


def build_create_table_command(
    schema_name: str,
    table_name: str,
    schema: Dict,
    unique_constraints: List[str] = None,
) -> str:
    mapping = column_type_mapping(schema)
    columns_and_types = [
        f"{clean_column_name(col)} {mapping[col]['type_converted']}" for col
        in schema['properties'].keys()
    ]

    if unique_constraints:
        index_name = f"{table_name}_{'_'.join(unique_constraints)}"
        columns_and_types.append(
            f"CONSTRAINT {index_name}_unique UNIQUE ({', '.join(unique_constraints)})",
        )

    return f"CREATE TABLE {schema_name}.{table_name} ({', '.join(columns_and_types)})"


def build_insert_command(
    schema_name: str,
    table_name: str,
    schema: Dict,
    records: List[Dict],
    unique_conflict_method: str = None,
    unique_constraints: List[str] = None,
) -> str:
    mapping = column_type_mapping(schema)
    columns = schema['properties'].keys()

    values = []
    for row in records:
        vals = []
        for column in columns:
            v = row.get(column, None)
            item_type_converted = mapping[column]['item_type_converted']
            column_type = mapping[column]['type']
            column_type_converted = mapping[column]['type_converted']

            value_final = 'NULL'
            if v is not None:
                if COLUMN_TYPE_ARRAY == column_type:
                    if type(v) is str:
                        v = literal_eval(v)

                    value_final = [str(s).replace("'", "''") for s in v]
                    value_final = f"'{{{', '.join(value_final)}}}'"
                else:
                    value_final = convert_column_to_type(
                        str(v).replace("'", "''"),
                        column_type_converted,
                    )

            vals.append(value_final)
        values.append(f"({', '.join(vals)})")

    commands = [
        f"INSERT INTO {schema_name}.{table_name}({', '.join([clean_column_name(col) for col in columns])})",
        f"VALUES {', '.join(values)}",
    ]

    if unique_constraints and unique_conflict_method:
        conflict_method = 'DO NOTHING'
        if UNIQUE_CONFLICT_METHOD_UPDATE == conflict_method:
            conflict_method = 'UPDATE'
        commands.append(f'ON CONFLICT {conflict_method}')

    return '\n'.join(commands)
