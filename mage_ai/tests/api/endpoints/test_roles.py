from mage_ai.authentication.permissions.constants import EntityName, PermissionAccess
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    User,
    UserRole,
)
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_detail_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)


class RoleAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.role = Role.create(name=self.faker.unique.name())
        self.permission = Permission.create(access=0)
        self.role_permission = RolePermission.create(
            permission_id=self.permission.id,
            role_id=self.role.id,
        )

        self.user_role = UserRole.create(role_id=self.role.id, user_id=self.user.id)
        self.user2 = User.create(username=self.faker.unique.name())

        self.permission2 = Permission.create(access=0)


build_list_endpoint_tests(
    RoleAPIEndpointTest,
    resource='role',
    get_list_count=lambda self: 2 if self.authentication or self.permissions else 1,
    result_keys_to_compare=[
        'created_at',
        'id',
        'name',
        'permissions',
        'role_permissions',
        'updated_at',
        'user',
    ],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.LIST,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.Permission,
        ),
        dict(
            access=Permission.add_accesses([
                PermissionAccess.LIST,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.User,
        )
    ],
)


build_list_endpoint_tests(
    RoleAPIEndpointTest,
    test_uuid='with_query_limit_roles',
    resource='role',
    get_list_count=lambda self: 2 if self.authentication or self.permissions else 1,
    build_query=lambda _self: dict(
        limit_roles=[1],
    ),
    result_keys_to_compare=[
        'created_at',
        'id',
        'name',
        'permissions',
        'role_permissions',
        'updated_at',
        'user',
    ],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.LIST,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.Permission,
        ),
        dict(
            access=Permission.add_accesses([
                PermissionAccess.LIST,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.User,
        )
    ],
)


build_create_endpoint_tests(
    RoleAPIEndpointTest,
    resource='role',
    assert_before_create_count=lambda self: len(
        Role.query.all(),
    ) == (2 if self.permissions or self.authentication else 1),
    assert_after_create_count=lambda self: len(
        Role.query.all(),
    ) == (2 + 1 if self.permissions or self.authentication else 1 + 1),
    build_payload=lambda self: dict(
        name=self.faker.unique.name(),
    ),
    authentication_accesses=[PermissionAccess.ADMIN],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.CREATE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.User,
        )
    ],
)


build_detail_endpoint_tests(
    RoleAPIEndpointTest,
    resource='role',
    get_resource_id=lambda self: self.role.id,
    result_keys_to_compare=[
        'created_at',
        'id',
        'name',
        'permissions',
        'role_permissions',
        'updated_at',
        'user',
        'users',
    ],
    authentication_accesses=[PermissionAccess.ADMIN],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.DETAIL,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.Permission,
        ),
    ],
)


def _assert_after_update_permissions_ids(self, _result, model):
    return len(RolePermission.query.filter(RolePermission.id == model.id).all()) == 0 and \
        len(RolePermission.query.filter(
            RolePermission.permission_id == self.permission2.id,
            RolePermission.role_id == self.role.id,
        ).all()) == 1


build_update_endpoint_tests(
    RoleAPIEndpointTest,
    test_uuid='with_permission_ids',
    resource='role',
    get_resource_id=lambda self: self.role.id,
    build_payload=lambda self: dict(
        permission_ids=[
            self.permission2.id,
        ],
    ),
    get_model_before_update=lambda self: RolePermission.query.get(self.role_permission.id),
    assert_after_update=_assert_after_update_permissions_ids,
    authentication_accesses=[PermissionAccess.ADMIN],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.UPDATE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.Permission,
        ),
        dict(
            access=Permission.add_accesses([
                PermissionAccess.UPDATE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.User,
        ),
    ],
)


def _assert_after_update_user_ids(self, _result, model):
    return len(UserRole.query.filter(UserRole.id == model.id).all()) == 0 and \
        len(UserRole.query.filter(
            UserRole.role_id == self.role.id,
            UserRole.user_id == self.user2.id,
        ).all()) == 1


build_update_endpoint_tests(
    RoleAPIEndpointTest,
    test_uuid='with_user_ids',
    resource='role',
    get_resource_id=lambda self: self.role.id,
    build_payload=lambda self: dict(
        user_ids=[
            self.user2.id,
        ],
    ),
    get_model_before_update=lambda self: UserRole.query.get(self.user_role.id),
    assert_after_update=_assert_after_update_user_ids,
    authentication_accesses=[PermissionAccess.ADMIN],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.UPDATE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.Permission,
        ),
        dict(
            access=Permission.add_accesses([
                PermissionAccess.UPDATE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.User,
        ),
    ],
)


build_delete_endpoint_tests(
    RoleAPIEndpointTest,
    resource='role',
    get_resource_id=lambda self: self.role.id,
    assert_before_delete_count=lambda self: len(
        Role.query.all(),
    ) == (2 if self.permissions or self.authentication else 1),
    assert_after_delete_count=lambda self: len(
        Role.query.all(),
    ) == (2 - 1 if self.permissions or self.authentication else 1 - 1),
    authentication_accesses=[PermissionAccess.ADMIN],
)
