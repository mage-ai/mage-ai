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
    return convert_column_type_orig(column_type, column_settings, **kwargs)
