from destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
    UNIQUE_CONFLICT_METHOD_UPDATE,
)
from destinations.utils import clean_column_name
from typing import List


def column_type_mapping(schema) -> dict:
    mapping = {}
    for column, column_settings in schema['properties'].items():
        column_types = [t for t in column_settings['type'] if 'null' != t]
        column_type = column_types[0]

        if COLUMN_TYPE_BOOLEAN == column_type:
            column_type_converted = 'BOOLEAN'
        elif COLUMN_TYPE_INTEGER == column_type:
            column_type_converted = 'BIGINT'
        elif COLUMN_TYPE_NUMBER == column_type:
            column_type_converted = 'DOUBLE PRECISION'
        elif COLUMN_TYPE_OBJECT == column_type:
            column_type_converted = 'TEXT'
        elif COLUMN_TYPE_STRING == column_type:
            if COLUMN_FORMAT_DATETIME == column_settings.get('format'):
                # Twice as long as the number of characters in ISO date format
                column_type_converted = 'VARCHAR(52)'
            else:
                column_type_converted = 'VARCHAR(255)'

        mapping[column] = dict(
            type=column_type,
            type_converted=column_type_converted,
        )

    return mapping


def convert_column_to_type(value, column_type):
    return f"CAST('{value}' AS {column_type})"


def build_create_table_command(
    schema_name: str,
    table_name: str,
    schema: dict,
    unique_constraints: List[str] = None,
) -> str:
    mapping = column_type_mapping(schema)
    columns_and_types = [
        f"{clean_column_name(col)} {mapping[col]['type_converted']}" for col
        in schema['properties'].keys()
    ]

    if unique_constraints:
        index_name = '_'.join(unique_constraints)
        columns_and_types.append(
            f"CONSTRAINT {index_name}_unique UNIQUE ({', '.join(unique_constraints)})",
        )

    return f"CREATE TABLE {schema_name}.{table_name} ({', '.join(columns_and_types)})"


def build_insert_command(
    schema_name: str,
    table_name: str,
    schema: dict,
    record: dict,
    unique_conflict_method: str = None,
    unique_constraints: List[str] = None,
) -> str:
    mapping = column_type_mapping(schema)
    columns = schema['properties'].keys()

    values = []
    for row in [record]:
        vals = []
        for column in columns:
            v = row.get(column, None)
            vals.append(convert_column_to_type(
                v,
                mapping[column]['type_converted'],
            ) if v is not None else 'NULL')
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
