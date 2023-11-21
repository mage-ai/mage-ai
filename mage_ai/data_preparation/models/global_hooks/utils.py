from typing import Dict

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.constants import (
    DISABLED_RESOURCE_TYPES,
    RESTRICTED_RESOURCE_TYPES,
    VALID_KEYS_FOR_INPUT_OUTPUT_DATA_ALL,
    VALID_KEYS_FOR_INPUT_OUTPUT_DATA_UNRESTRICTED,
)
from mage_ai.shared.hash import extract


def extract_valid_data(resource_type: EntityName, input_data: Dict) -> Dict:
    types = DISABLED_RESOURCE_TYPES + RESTRICTED_RESOURCE_TYPES
    if not resource_type or resource_type in types:
        return extract(input_data or {}, VALID_KEYS_FOR_INPUT_OUTPUT_DATA_UNRESTRICTED)

    return extract(
        input_data or {},
        VALID_KEYS_FOR_INPUT_OUTPUT_DATA_ALL,
    )
