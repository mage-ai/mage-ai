from typing import Dict, List

from mage_integrations.destinations.sql.constants import SQL_RESERVED_WORDS
from mage_integrations.destinations.utils import (
    clean_column_name as clean_column_name_orig,
)
from mage_integrations.sources.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_BOOLEAN,
    COLUMN_TYPE_INTEGER,
    COLUMN_TYPE_NULL,
    COLUMN_TYPE_NUMBER,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
)


def clean_column_name(col, lower_case: bool = True, handle_leading_underscore: bool = True):
    col_new = clean_column_name_orig(col, lower_case=lower_case)
    if handle_leading_underscore and col_new.startswith('_'):
        # Oracle does not allow column names to start with an underscore,
        # so we need to wrap it with quotes.
        col_new = f'"{col_new}"'
    if col_new.upper() in (SQL_RESERVED_WORDS):
        if handle_leading_underscore:
            col_new = f'"_{col_new}"'
        else:
            col_new = f'_{col_new}'
    return col_new


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
    return f"ALTER TABLE {full_table_name} ADD ({', '.join(columns_and_types)})"


def convert_column_to_type(value, column_type) -> str:
    if column_type == 'NCLOB':
        return f"to_nclob('{value}')"
    return f"CAST('{value}' AS {column_type})"


def build_create_table_command(
    column_type_mapping: Dict,
    columns: List[str],
    full_table_name: str,
    key_properties: List[str],
    schema: Dict,
    unique_constraints: List[str] = None,
    use_lowercase: bool = True,
) -> str:
    columns_and_types = []
    column_properties = schema['properties']

    for col in columns:
        column_name = clean_column_name(col, lower_case=use_lowercase)
        column_type = column_type_mapping[col]['type_converted']
        if COLUMN_TYPE_INTEGER == column_type_mapping[col]['type']:
            column_type = 'INTEGER'

        column_props = []
        if COLUMN_TYPE_NULL not in column_properties.get(col).get('type', []):
            column_props.append('NOT NULL')

        col_statement = f'{column_name} {column_type}'
        if len(column_props) >= 1:
            col_statement = f"{col_statement} {' '.join(column_props)}"
        columns_and_types.append(col_statement)

    if unique_constraints:
        unique_constraints = [clean_column_name(col, lower_case=use_lowercase)
                              for col in unique_constraints]
        index_name = '_'.join([
            clean_column_name(full_table_name, lower_case=use_lowercase),
        ] + unique_constraints)
        index_name = f'unique{index_name}'[:64]
        columns_and_types.append(f"CONSTRAINT {index_name} Unique({', '.join(unique_constraints)})")

    if key_properties and len(key_properties) >= 1:
        col = clean_column_name(key_properties[0], lower_case=use_lowercase)
        columns_and_types.append(f'PRIMARY KEY ({col})')

    return f"CREATE TABLE {full_table_name} ({', '.join(columns_and_types)})"


def convert_column_type(column_type: str, column_settings: Dict, **kwargs) -> str:
    if COLUMN_TYPE_BOOLEAN == column_type:
        return 'CHAR(52)'
    elif COLUMN_TYPE_INTEGER == column_type:
        return 'NUMBER'
    elif COLUMN_TYPE_NUMBER == column_type:
        return 'NUMBER'
    elif COLUMN_TYPE_OBJECT == column_type:
        return 'NCLOB'
    elif COLUMN_TYPE_STRING == column_type:
        if COLUMN_FORMAT_DATETIME == column_settings.get('format'):
            # Twice as long as the number of characters in ISO date format
            return 'CHAR(52)'

    return 'CHAR(255)'
