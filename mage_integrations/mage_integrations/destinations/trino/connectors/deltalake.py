from mage_integrations.destinations.constants import (
    COLUMN_TYPE_OBJECT,
)
from mage_integrations.destinations.sql.utils import (
    column_type_mapping as column_type_mapping_orig,
    convert_column_type as convert_column_type_orig,
)
from mage_integrations.destinations.trino.connectors.base import TrinoConnector
import json
from typing import Dict


def convert_column_type(
    column_type: str,
    column_settings: Dict,
    **kwargs,
) -> str:
    if COLUMN_TYPE_OBJECT == column_type:
        return 'VARCHAR'

    return convert_column_type_orig(column_type, column_settings, **kwargs)


class TrinoDeltalake(TrinoConnector):
    def column_type_mapping(self, schema: Dict) -> Dict:
        return column_type_mapping_orig(
            schema,
            convert_column_type,
            lambda item_type_converted: f'ARRAY<{item_type_converted}>',
        )

    def convert_array(self, value: str, column_type_dict: Dict) -> str:
        if len(value) == 0:
            return 'NULL'
        item_type_converted = column_type_dict['item_type_converted']

        return f"CAST('{json.dumps(value)}' AS {item_type_converted})"
