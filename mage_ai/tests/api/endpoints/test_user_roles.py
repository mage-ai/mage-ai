from mage_ai.authentication.permissions.constants import PermissionAccess
from mage_ai.orchestration.db.models.oauth import UserRole
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
)


class UserRoleAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.user_role = UserRole.create(role_id=0, user_id=0)

    def tearDown(self):
        self.user_role.delete()
        super().tearDown()


build_create_endpoint_tests(
    UserRoleAPIEndpointTest,
    resource='user_role',
    authentication_accesses=[PermissionAccess.ADMIN],
    build_payload=lambda self: dict(
        role_id=0,
        user_id=0,
    ),
    assert_before_create_count=lambda self: len(
        UserRole.query.all(),
    ) == 2 if (self.authentication or self.permissions) else 1,
    assert_after_create_count=lambda self: len(
        UserRole.query.all(),
    ) == 2 + 1 if (self.authentication or self.permissions) else 1 + 1,
)

build_delete_endpoint_tests(
    UserRoleAPIEndpointTest,
    resource='user_role',
    get_resource_id=lambda self: self.user_role.id,
    authentication_accesses=[PermissionAccess.ADMIN],
    assert_before_delete_count=lambda self: len(
        UserRole.query.filter(UserRole.id == self.user_role.id).all(),
    ) == 1,
    assert_after_delete_count=lambda self: len(
        UserRole.query.filter(UserRole.id == self.user_role.id).all(),
    ) == 0,
)
