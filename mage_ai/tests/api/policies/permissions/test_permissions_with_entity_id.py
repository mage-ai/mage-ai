from unittest.mock import patch

from mage_ai.tests.api.mixins import BootstrapMixin
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.api.policies.permissions.mixins import PermissionsMixin


@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
class PermissionsWithEntityIDTest(BaseApiTestCase, BootstrapMixin, PermissionsMixin):
    def test_authorized(self):
        pass

    def test_unauthorized(self):
        pass
