from mage_integrations.destinations.constants import (
    COLUMN_FORMAT_DATETIME,
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING
)
from mage_integrations.destinations.sql.utils import convert_column_type as convert_column_type_orig
from typing import Dict, List
import json


def convert_array(v: List, column_type_dict: Dict):
    return json.dumps(v)


def convert_column_type(
    column_type: str,
    column_settings: Dict,
    **kwargs,
) -> str:
    if COLUMN_TYPE_OBJECT == column_type:
        return 'VARCHAR(65535)'
    if COLUMN_TYPE_STRING == column_type and COLUMN_FORMAT_DATETIME == column_settings.get('format'):
        return 'TIMESTAMPTZ'
    return convert_column_type_orig(column_type, column_settings, **kwargs)
