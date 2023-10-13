from unittest.mock import patch

from mage_ai.tests.api.operations.base.mixins import Base


@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 0)
class BaseOperationsWithUserAuthenticationTest(Base):
    pass
