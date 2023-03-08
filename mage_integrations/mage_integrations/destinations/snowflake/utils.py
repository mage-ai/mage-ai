from mage_integrations.destinations.constants import COLUMN_TYPE_ARRAY, COLUMN_TYPE_OBJECT
from mage_integrations.destinations.sql.utils import (
    clean_column_name,
    convert_column_type as convert_column_type_og,
)
from typing import Dict, List


def build_alter_table_command(
    column_type_mapping: Dict,
    columns: List[str],
    full_table_name: str,
    column_identifier: str = '',
) -> str:
    if not columns:
        return None

    columns_and_types = [
        f"{column_identifier}{clean_column_name(col)}{column_identifier}" +
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

    return convert_column_type_og(column_type, column_settings)
