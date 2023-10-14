from mage_ai.authentication.permissions.constants import EntityName, PermissionAccess
from mage_ai.orchestration.db.models.oauth import Permission
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
        Permission.create(access=0)
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
    assert_after_create_count=lambda self: 3 if self.authentication or self.permissions else 2,
    assert_before_create_count=lambda self: 3 if self.authentication or self.permissions else 2,
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
)


build_update_endpoint_tests(
    PermissionAPIEndpointTest,
    resource='permissions',
    get_resource_id=lambda self: self.permissions_fetched[0].id,
    build_payload=lambda self: dict(access=999),
    get_model_before_update=lambda self: Permission.query.get(self.permissions_fetched[0].id),
    assert_after_update=lambda self, result, model: model.access != result['access'],
    authentication_accesses=[PermissionAccess.ADMIN],
)


build_delete_endpoint_tests(
    PermissionAPIEndpointTest,
    resource='permissions',
    get_resource_id=lambda self: self.permissions_fetched[0].id,
    assert_after_delete_count=lambda self: len(
        Permission.query.all(),
    ) == (1 if self.authentication or self.permissions else 0),
    assert_before_delete_count=lambda self: len(
        Permission.query.all(),
    ) == (2 if self.authentication or self.permissions else 1),
    authentication_accesses=[PermissionAccess.ADMIN],
)
