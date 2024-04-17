import json
from typing import Dict

from mage_integrations.destinations.constants import (
    COLUMN_TYPE_OBJECT,
    COLUMN_TYPE_STRING,
)
from mage_integrations.destinations.sql.utils import (
    column_type_mapping as column_type_mapping_orig,
)
from mage_integrations.destinations.sql.utils import (
    convert_column_type as convert_column_type_orig,
)
from mage_integrations.destinations.trino.connectors.base import TrinoConnector


def convert_column_type(
    column_type: str,
    column_settings: Dict,
    **kwargs,
) -> str:
    if COLUMN_TYPE_OBJECT == column_type:
        return 'VARCHAR'

    return convert_column_type_orig(column_type, column_settings, **kwargs)


class TrinoDeltalake(TrinoConnector):
    name = 'delta-lake'

    def column_type_mapping(self, schema: Dict) -> Dict:
        return column_type_mapping_orig(
            schema,
            convert_column_type,
            lambda item_type_converted: f'ARRAY<{item_type_converted}>',
            array_default_item_type=COLUMN_TYPE_STRING,
        )

    def convert_array(self, value: str, column_type_dict: Dict) -> str:
        if len(value) == 0:
            return 'NULL'
        item_type_converted = column_type_dict['item_type_converted']

        if item_type_converted == 'VARCHAR':
            if len(value) > 0 and (type(value[0]) is dict or type(value[0]) is list):
                value_serialized = json.dumps([json.dumps(i) for i in value])
            else:
                value_serialized = json.dumps(value)
        else:
            value_serialized = json.dumps(value)

        value_serialized = value_serialized.replace("'", "''")
        return f"CAST(JSON '{value_serialized}' AS ARRAY<{item_type_converted}>)"
