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


def convert_json_or_string(value, column_type_dict):
    return value.replace("'", '\"')
