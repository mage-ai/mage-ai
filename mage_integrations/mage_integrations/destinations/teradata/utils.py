from typing import Dict, List

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
    columns_and_types = []
    for col in columns:
        column_with_type_str = (
            f"{column_identifier}{clean_column_name(col, use_lowercase, allow_reserved_words)}"
            f"{column_identifier}" +
            f" {column_type_mapping[col]['type_converted']}"
        )
        if key_properties and col in key_properties:
            column_with_type_str += ' NOT NULL'
        columns_and_types.append(column_with_type_str)

    if unique_constraints:
        # Not add two indexes to the same column
        unique_constraints_clean = []
        for col in unique_constraints:
            if key_properties and col in key_properties:
                continue
            unique_constraints_clean.append(
                clean_column_name(col, use_lowercase, allow_reserved_words))

        if unique_constraints_clean:
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
    allow_reserved_words: bool = False
) -> str:
    if not columns:
        return None

    columns_and_types = [
        f"ADD {column_identifier}{clean_column_name(col, lower_case=use_lowercase, allow_reserved_words=allow_reserved_words)}{column_identifier}" + # noqa
        f" {column_type_mapping[col]['type_converted']}" for col
        in columns
    ]
    # TODO: support add new unique constraints
    return f"ALTER TABLE {full_table_name} {', '.join(columns_and_types)}"
