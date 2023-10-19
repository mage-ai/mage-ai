from mage_ai.authentication.permissions.constants import PermissionAccess
from mage_ai.orchestration.db.models.oauth import RolePermission
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
)


class RolePermissionAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.role_permission = RolePermission.create(permission_id=0, role_id=0)

    def tearDown(self):
        self.role_permission.delete()
        super().tearDown()


build_create_endpoint_tests(
    RolePermissionAPIEndpointTest,
    resource='role_permission',
    authentication_accesses=[PermissionAccess.ADMIN],
    build_payload=lambda self: dict(
        permission_id=0,
        role_id=0,
    ),
    assert_before_create_count=lambda self: len(
        RolePermission.query.all(),
    ) == 2 if self.permissions else 1,
    assert_after_create_count=lambda self: len(
        RolePermission.query.all(),
    ) == 2 + 1 if self.permissions else 1 + 1,
)


build_create_endpoint_tests(
    RolePermissionAPIEndpointTest,
    test_uuid='with_permission_ids',
    resource='role_permission',
    authentication_accesses=[PermissionAccess.ADMIN],
    build_payload=lambda self: dict(
        role_id=0,
        permission_ids=[
            1,
            2,
            3,
        ],
    ),
    assert_before_create_count=lambda self: len(
        RolePermission.query.all(),
    ) == 2 if self.permissions else 1,
    assert_after_create_count=lambda self: len(
        RolePermission.query.all(),
    ) == 2 + 3 if self.permissions else 1 + 3,
)


build_delete_endpoint_tests(
    RolePermissionAPIEndpointTest,
    resource='role_permission',
    get_resource_id=lambda self: self.role_permission.id,
    authentication_accesses=[PermissionAccess.ADMIN],
    assert_before_delete_count=lambda self: len(
        RolePermission.query.filter(RolePermission.id == self.role_permission.id).all(),
    ) == 1,
    assert_after_delete_count=lambda self: len(
        RolePermission.query.filter(RolePermission.id == self.role_permission.id).all(),
    ) == 0,
)
