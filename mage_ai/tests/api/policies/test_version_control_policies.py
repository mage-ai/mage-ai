from unittest.mock import patch

from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.VersionControlBranchPolicy import VersionControlBranchPolicy
from mage_ai.api.policies.VersionControlFilePolicy import VersionControlFilePolicy
from mage_ai.api.policies.VersionControlProjectPolicy import VersionControlProjectPolicy
from mage_ai.api.policies.VersionControlRemotePolicy import VersionControlRemotePolicy
from mage_ai.authentication.permissions.constants import PermissionAccess
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    User,
    UserRole,
)
from mage_ai.tests.api.operations.test_base import BaseApiTestCase

POLICIES = [VersionControlBranchPolicy, VersionControlFilePolicy,
            VersionControlProjectPolicy, VersionControlRemotePolicy]
ACTIONS = [OperationType.CREATE, OperationType.DELETE, OperationType.DETAIL,
           OperationType.LIST, OperationType.UPDATE]


@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
class VersionControlPolicyTests(BaseApiTestCase):
    def user_for_role(self, access=None):
        user = User.create(username=self.faker.unique.name())
        if access is not None:
            role = Role.create(name=self.faker.unique.name())
            permission = Permission.create(access=access, entity_name='ALL')
            RolePermission.create(role_id=role.id, permission_id=permission.id)
            UserRole.create(user_id=user.id, role_id=role.id)
        return user

    async def check_actions(self, user, allowed):
        for cls in POLICIES:
            for action in ACTIONS:
                with self.subTest(policy=cls.__name__, action=action):
                    policy = cls(None, user)
                    if allowed:
                        await policy.authorize_action(action)
                    else:
                        with self.assertRaises(ApiError):
                            await policy.authorize_action(action)

    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 0)
    async def test_legacy_viewer_and_no_role_cannot_access_version_control(self):
        for roles in [None, 0, 4]:
            user = User.create(username=self.faker.unique.name(), roles=roles)
            await self.check_actions(user, False)

    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 0)
    async def test_legacy_editor_admin_and_owner_keep_access(self):
        for roles in [1, 2]:
            user = User.create(username=self.faker.unique.name(), roles=roles)
            await self.check_actions(user, True)
        await self.check_actions(User.create(username=self.faker.unique.name(), _owner=True), True)

    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 0)
    async def test_legacy_attribute_and_query_checks_cannot_bypass_role(self):
        for roles, allowed in [(4, False), (2, True)]:
            user = User.create(username=self.faker.unique.name(), roles=roles)
            for cls in POLICIES:
                checks = []
                for read_or_write, rules in [('read', cls.read_rules), ('write', cls.write_rules)]:
                    for attribute, scopes in rules[cls.__name__].items():
                        for action in scopes['private']:
                            checks.append((read_or_write, attribute, action))
                for kind, attribute, action in checks:
                    with self.subTest(
                        policy=cls.__name__, kind=kind, attribute=attribute, action=action,
                    ):
                        policy = cls(None, user, api_operation_action=action)
                        if allowed:
                            await policy.authorize_attribute(kind, attribute)
                        else:
                            with self.assertRaises(ApiError):
                                await policy.authorize_attribute(kind, attribute)
                for attribute, scopes in cls.query_rules[cls.__name__].items():
                    for action in scopes['private']:
                        policy = cls(None, user, api_operation_action=action)
                        if allowed:
                            await policy.authorize_query({attribute: ['1']})
                        else:
                            with self.assertRaises(ApiError):
                                await policy.authorize_query({attribute: ['1']})

    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
    async def test_granular_denials_are_not_overridden(self):
        await self.check_actions(self.user_for_role(), False)
        await self.check_actions(self.user_for_role(PermissionAccess.DISABLE_OPERATION_ALL), False)
        user = self.user_for_role()
        for cls in POLICIES:
            policy = cls(None, user, api_operation_action=OperationType.UPDATE)
            with self.assertRaises(ApiError):
                await policy.authorize_attribute('write', 'command')
            with self.assertRaises(ApiError):
                await policy.authorize_attribute('read', 'output')

    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
    async def test_granular_editor_admin_owner_keep_access(self):
        for access in [PermissionAccess.EDITOR, PermissionAccess.ADMIN, PermissionAccess.OWNER]:
            await self.check_actions(self.user_for_role(access), True)

    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
    async def test_granular_viewer_can_inspect_but_cannot_mutate(self):
        user = self.user_for_role(PermissionAccess.VIEWER)
        for cls in POLICIES:
            for action in ACTIONS:
                policy = cls(None, user)
                if action in [OperationType.DETAIL, OperationType.LIST]:
                    await policy.authorize_action(action)
                else:
                    with self.assertRaises(ApiError):
                        await policy.authorize_action(action)
