from unittest.mock import patch

from mage_ai.authentication.permissions.constants import EntityName, PermissionAccess
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    UserRole,
)
from mage_ai.tests.api.operations.base.mixins import Base


@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
class BaseOperationsWithUserAuthenticationAndPermissionsTest(Base):
    def setUp(self):
        self.set_up()

        role = Role.create(name=self.faker.unique.name())
        permission = Permission.create(
            access=Permission.add_accesses([
                PermissionAccess.LIST,
                PermissionAccess.QUERY,
                PermissionAccess.READ,
            ]),
            entity_name=EntityName.Log,
            options=dict(
                read_attributes=[
                    'id',
                    'name',
                    'power',
                ],
                query_attributes=[
                    'id',
                ],
            ),
        )
        RolePermission.create(permission_id=permission.id, role_id=role.id)
        UserRole.create(role_id=role.id, user_id=self.user.id)

    def tearDown(self):
        self.tear_down()

    def test_query_getter(self):
        self.run_test_query_getter()

    def test_query_setter(self):
        self.run_test_query_setter()

    async def test_execute_list(self):
        await self.run_test_execute_list()

    async def test_execute_list_with_query(self):
        await self.run_test_execute_list_with_query()
