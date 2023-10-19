from mage_ai.authentication.permissions.constants import EntityName, PermissionAccess
from mage_ai.orchestration.db.models.oauth import Permission, Role, RolePermission
from mage_ai.tests.api.endpoints.mixins import (
    BaseAPIEndpointTest,
    build_create_endpoint_tests,
    build_delete_endpoint_tests,
    build_detail_endpoint_tests,
    build_list_endpoint_tests,
    build_update_endpoint_tests,
)


class PermissionAPIEndpointTest(BaseAPIEndpointTest):
    def setUp(self):
        super().setUp()
        self.role = Role.create(name=self.faker.unique.name())
        self.permission = Permission.create(access=0)
        self.role_permission = RolePermission.create(
            permission_id=self.permission.id,
            role_id=self.role.id,
        )
        self.role2 = Role.create(name=self.faker.unique.name())

        self.permissions_fetched = Permission.query.all()
        self.count = len(self.permissions_fetched)


build_list_endpoint_tests(
    PermissionAPIEndpointTest,
    resource='permission',
    get_list_count=lambda self: 2 if self.authentication or self.permissions else 1,
    result_keys_to_compare=[
        'access',
        'created_at',
        'entity',
        'entity_id',
        'entity_name',
        'entity_type',
        'id',
        'updated_at',
    ],
)


build_create_endpoint_tests(
    PermissionAPIEndpointTest,
    resource='permissions',
    assert_before_create_count=lambda self: len(
        Permission.query.all(),
    ) == (4 if self.permissions else 2 if self.authentication else 1),
    assert_after_create_count=lambda self: len(
        Permission.query.all(),
    ) == (4 + 1 if self.permissions else 2 + 1 if self.authentication else 1 + 1),
    build_payload=lambda self: dict(
        access=0,
    ),
    authentication_accesses=[PermissionAccess.ADMIN],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.CREATE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.Role,
        ),
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
    PermissionAPIEndpointTest,
    resource='permissions',
    get_resource_id=lambda self: self.permissions_fetched[0].id,
    result_keys_to_compare=[
        'conditions',
        'entity_names',
        'entity_types',
        'query_attributes',
        'read_attributes',
        'role',
        'roles',
        'user',
        'user_id',
        'users',
        'write_attributes',
    ],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.DETAIL,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.Role,
        ),
        dict(
            access=Permission.add_accesses([
                PermissionAccess.DETAIL,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.User,
        )
    ],
)


def _assert_after_update(self, result, model):
    return len(RolePermission.query.filter(RolePermission.id == model.id).all()) == 0 and \
        len(RolePermission.query.filter(RolePermission.role_id == self.role2.id).all()) == 1


build_update_endpoint_tests(
    PermissionAPIEndpointTest,
    resource='permissions',
    get_resource_id=lambda self: self.permissions_fetched[0].id,
    build_payload=lambda self: dict(access=999),
    get_model_before_update=lambda self: Permission.query.get(self.permissions_fetched[0].id),
    assert_after_update=lambda self, result, model: model.access != result['access'],
    authentication_accesses=[PermissionAccess.ADMIN],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.UPDATE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.Role,
        ),
        dict(
            access=Permission.add_accesses([
                PermissionAccess.UPDATE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.User,
        )
    ],
)


build_update_endpoint_tests(
    PermissionAPIEndpointTest,
    test_uuid='with_role_ids',
    resource='permissions',
    get_resource_id=lambda self: self.permissions_fetched[0].id,
    build_payload=lambda self: dict(
        role_ids=[
            self.role2.id,
        ],
    ),
    get_model_before_update=lambda self: RolePermission.query.get(self.role_permission.id),
    assert_after_update=_assert_after_update,
    authentication_accesses=[PermissionAccess.ADMIN],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.UPDATE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.Role,
        ),
        dict(
            access=Permission.add_accesses([
                PermissionAccess.UPDATE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.User,
        )
    ],
)


build_delete_endpoint_tests(
    PermissionAPIEndpointTest,
    resource='permissions',
    get_resource_id=lambda self: self.permissions_fetched[0].id,
    assert_before_delete_count=lambda self: len(
        Permission.query.all(),
    ) == (4 if self.permissions else 2 if self.authentication else 1),
    assert_after_delete_count=lambda self: len(
        Permission.query.all(),
    ) == (3 if self.permissions else 1 if self.authentication else 0),
    authentication_accesses=[PermissionAccess.ADMIN],
    permission_settings=[
        dict(
            access=Permission.add_accesses([
                PermissionAccess.DELETE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.Role,
        ),
        dict(
            access=Permission.add_accesses([
                PermissionAccess.DELETE,
                PermissionAccess.READ_ALL,
            ]),
            entity_name=EntityName.User,
        )
    ],
)
