from mage_ai.authentication.permissions.constants import PermissionAccess
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
)


class SeedAPIEndpointTest(BaseAPIEndpointTest):
    pass


build_create_endpoint_tests(
    SeedAPIEndpointTest,
    resource='seed',
    authentication_accesses=[PermissionAccess.OWNER],
    permissions_accesses=[PermissionAccess.OWNER],
    build_payload=lambda self: dict(
        roles=True,
        permissions=True,
        policy_names=['Block', 'Pipeline', 'Download'],
    ),
    assert_before_create_count=lambda self: True,
    assert_after_create_count=lambda self: True,
)
