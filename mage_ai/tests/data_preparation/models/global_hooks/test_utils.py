import uuid

from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.data_preparation.models.global_hooks.constants import (
    DISABLED_RESOURCE_TYPES,
    RESTRICTED_RESOURCE_TYPES,
    VALID_KEYS_FOR_INPUT_OUTPUT_DATA_ALL,
    HookInputKey,
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

        limited_types = DISABLED_RESOURCE_TYPES + RESTRICTED_RESOURCE_TYPES
        entity_names = [entity_name for entity_name in EntityName if entity_name not in [
            EntityName.ALL,
            EntityName.ALL_EXCEPT_RESERVED,
        ]]

        for entity_name in entity_names:
            extracted_data = extract_valid_data(entity_name, data)

            if entity_name in limited_types:
                self.assertEqual(extracted_data, dict(
                    hook=data['hook'],
                    resource_id=data['resource_id'],
                    resource_parent_id=data['resource_parent_id'],
                    resource_parent_type=data['resource_parent_type'],
                    user=data['user'],
                ))
            else:
                self.assertEqual(extracted_data, ignore_keys(data, [
                    'mage',
                    HookInputKey.RESOURCE_PARENT.value,
                ]))

            for resource_parent_type in entity_names:
                extracted_data = extract_valid_data(
                    entity_name,
                    data,
                    resource_parent_type=resource_parent_type,
                )

                if entity_name in limited_types:
                    self.assertEqual(extracted_data, dict(
                        hook=data['hook'],
                        resource_id=data['resource_id'],
                        resource_parent_id=data['resource_parent_id'],
                        resource_parent_type=data['resource_parent_type'],
                        user=data['user'],
                    ))
                else:
                    if resource_parent_type in limited_types:
                        self.assertEqual(extracted_data, ignore_keys(data, [
                            'mage',
                            HookInputKey.RESOURCE_PARENT.value,
                        ]))
                        self.assertTrue(HookInputKey.RESOURCE_PARENT.value not in extracted_data)
                    else:
                        self.assertEqual(extracted_data, ignore_keys(data, [
                            'mage',
                        ]))
                        self.assertTrue(HookInputKey.RESOURCE_PARENT.value in extracted_data)
