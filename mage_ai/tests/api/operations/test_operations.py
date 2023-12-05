from unittest.mock import patch

from mage_ai.api.operations import constants
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.tests.api.operations.test_base import BaseApiTestCase


class OperationTests(BaseApiTestCase):
    @patch('mage_ai.settings.DISABLE_NOTEBOOK_EDIT_ACCESS', 1)
    @patch('mage_ai.api.utils.DISABLE_NOTEBOOK_EDIT_ACCESS', 1)
    @patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 1)
    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 0)
    async def test_execute_create_with_disable_edit_access(self):
        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(block=dict(
                name='test block',
                type=BlockType.DATA_LOADER,
            )),
            resource='blocks',
            user=None,
        )
        response = await operation.execute()

        self.assertIsNotNone(response['error'])

    @patch('mage_ai.settings.DISABLE_NOTEBOOK_EDIT_ACCESS', 1)
    @patch('mage_ai.api.utils.DISABLE_NOTEBOOK_EDIT_ACCESS', 1)
    @patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 1)
    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
    async def test_execute_create_with_disable_edit_access_and_user(self):
        operation = self.build_operation(
            action=constants.CREATE,
            payload=dict(block=dict(
                name='test block',
                type=BlockType.DATA_LOADER,
            )),
            resource='blocks',
            user=User(),
        )
        response = await operation.execute()

        self.assertIsNotNone(response['error'])
