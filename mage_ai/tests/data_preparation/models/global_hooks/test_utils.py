import uuid

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.constants import (
    DISABLED_RESOURCE_TYPES,
    RESTRICTED_RESOURCE_TYPES,
    VALID_KEYS_FOR_INPUT_OUTPUT_DATA_ALL,
)
from mage_ai.data_preparation.models.global_hooks.utils import extract_valid_data
from mage_ai.shared.hash import ignore_keys
from mage_ai.tests.base_test import AsyncDBTestCase


class GlobalHookUtilsTest(AsyncDBTestCase):
    def test_extract_valid_data(self):
        data = dict(
            mage=uuid.uuid4().hex,
        )

        for key in VALID_KEYS_FOR_INPUT_OUTPUT_DATA_ALL:
            data[key] = uuid.uuid4().hex

        types = DISABLED_RESOURCE_TYPES + RESTRICTED_RESOURCE_TYPES
        for entity_name in EntityName:
            if entity_name in [EntityName.ALL, EntityName.ALL_EXCEPT_RESERVED]:
                continue

            extracted_data = extract_valid_data(entity_name, data)

            if entity_name in types:
                self.assertEqual(extracted_data, dict(hook=data['hook']))
            else:
                self.assertEqual(extracted_data, ignore_keys(data, ['mage']))
