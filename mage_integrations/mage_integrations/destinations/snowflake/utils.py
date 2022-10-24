from mage_integrations.destinations.constants import COLUMN_TYPE_OBJECT
from mage_integrations.destinations.sql.utils import convert_column_type as convert_column_type_og
from typing import Dict


def convert_column_type(column_type: str, column_settings: Dict) -> str:
    if COLUMN_TYPE_OBJECT == column_type:
        return 'OBJECT'

    return convert_column_type_og(column_type, column_settings)
