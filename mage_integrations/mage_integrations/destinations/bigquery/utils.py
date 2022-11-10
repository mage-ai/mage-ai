from mage_integrations.destinations.constants import COLUMN_TYPE_OBJECT
from mage_integrations.destinations.sql.utils import convert_column_type as convert_column_type_orig
from typing import Dict


def convert_column_type(
    column_type: str,
    column_settings: Dict,
    **kwargs,
) -> str:
    if COLUMN_TYPE_OBJECT == column_type:
        return 'JSON'

    return convert_column_type_orig(column_type, column_settings, **kwargs)


def convert_column_to_type(value, column_type) -> str:
    value = value.replace("'", "\\'")
    return f"CAST('{value}' AS {column_type})"
