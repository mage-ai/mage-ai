from typing import Dict

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.constants import (
    DISABLED_RESOURCE_TYPES,
    RESTRICTED_RESOURCE_TYPES,
    VALID_KEYS_FOR_INPUT_OUTPUT_DATA_ALL,
    VALID_KEYS_FOR_INPUT_OUTPUT_DATA_UNRESTRICTED,
    HookInputKey,
)
from mage_ai.shared.hash import extract, ignore_keys


def extract_valid_data(
    resource_type: EntityName,
    input_data: Dict,
    resource_parent_type: EntityName = None,
) -> Dict:
    data = {}

    limited_types = DISABLED_RESOURCE_TYPES + RESTRICTED_RESOURCE_TYPES
    if not resource_type or resource_type in limited_types:
        data = extract(input_data or {}, VALID_KEYS_FOR_INPUT_OUTPUT_DATA_UNRESTRICTED)
    else:
        data = extract(
            input_data or {},
            VALID_KEYS_FOR_INPUT_OUTPUT_DATA_ALL,
        )

    if not resource_parent_type or resource_parent_type in limited_types:
        data = ignore_keys(data, [HookInputKey.RESOURCE_PARENT.value])

    return data
