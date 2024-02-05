from unittest.mock import patch

from mage_ai.authentication.permissions.constants import EntityName, PermissionAccess
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    UserRole,
)
from mage_ai.tests.api.operations.base.mixins import Base


class BaseOperationsWithUserAuthenticationAndPermissionsTest(Base):
    def setUp(self):
        self.set_up()

        try:
            self.user.save()
        except Exception as err:
            print(err)

        role = Role.create(name=self.faker.unique.name())
        permission = Permission.create(
            access=Permission.add_accesses([
                PermissionAccess.CREATE,
                PermissionAccess.DELETE,
                PermissionAccess.DETAIL,
                PermissionAccess.LIST,
                PermissionAccess.QUERY,
                PermissionAccess.READ,
                PermissionAccess.UPDATE,
                PermissionAccess.WRITE,
            ]),
            entity_name=EntityName.Log,
            options=dict(
                read_attributes=[
                    'id',
                    'name',
                    'power',
                    'spell_id',
                    'success',
                ],
                query_attributes=[
                    'id',
                ],
                write_attributes=[
                    'id',
                    'name',
                    'power',
                    'spell_id',
                ],
            ),
        )
        RolePermission.create(permission_id=permission.id, role_id=role.id)
        UserRole.create(role_id=role.id, user_id=self.user.id)

    def tearDown(self):
        self.tear_down()


for method_name in dir(Base):
    if not method_name.startswith('run_mixin_'):
        continue

    async def _test(self, method=method_name):
        with patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1):
            with patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1):
                await getattr(self, method)()

    setattr(
        BaseOperationsWithUserAuthenticationAndPermissionsTest,
        method_name.replace('run_mixin_', ''),
        _test,
    )

    if method_name.startswith('run_mixin_test_execute_'):
        async def _test_with_parent(self, method=method_name):
            with patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1):
                with patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1):
                    await getattr(self, method)(**self.parent_resource_options())

        setattr(
            BaseOperationsWithUserAuthenticationAndPermissionsTest,
            method_name.replace('run_mixin_', '') + '_with_parent',
            _test_with_parent,
        )
