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
