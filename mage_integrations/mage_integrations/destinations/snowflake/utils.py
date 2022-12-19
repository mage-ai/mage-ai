from mage_integrations.destinations.constants import COLUMN_TYPE_ARRAY, COLUMN_TYPE_OBJECT
from mage_integrations.destinations.sql.utils import convert_column_type as convert_column_type_og
from typing import Dict


def convert_column_type(column_type: str, column_settings: Dict, **kwargs) -> str:
    if COLUMN_TYPE_OBJECT == column_type:
        return 'VARIANT'
    elif COLUMN_TYPE_ARRAY == column_settings.get('type_converted') or \
            COLUMN_TYPE_ARRAY == column_type:
        return 'ARRAY'

    return convert_column_type_og(column_type, column_settings)
