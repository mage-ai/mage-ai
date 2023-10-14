import importlib
from typing import Any, Callable, Dict, Union
from unittest.mock import patch

import inflection
from faker import Faker

from mage_ai.api.operations.base import BaseOperation
from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.permissions.constants import EntityName, PermissionAccess
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    User,
    UserRole,
)
from mage_ai.shared.strings import classify, singularize
from mage_ai.tests.base_test import AsyncDBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


def entity_name(resource: str) -> str:
    return inflection.singularize(classify(singularize(resource)))


def get_policy(resource: str):
    model_name = entity_name(resource)
    return getattr(
        importlib.import_module(f'mage_ai.api.policies.{model_name}Policy'),
        f'{model_name}Policy',
    )


def get_resource(resource: str):
    model_name = entity_name(resource)
    return getattr(
        importlib.import_module(f'mage_ai.api.resources.{model_name}Resource'),
        f'{model_name}Resource',
    )


def build_list_endpoint_tests(
    test_class,
    resource: str,
    list_count: int = None,
    get_list_count: Callable[[AsyncDBTestCase], int] = None,
    resource_parent: str = None,
    get_resource_parent_id: Callable[[AsyncDBTestCase], Union[int, str]] = None,
):
    def _build_test_list_endpoint(
        authentication: int = None,
        permissions: int = None,
        list_count=list_count,
        get_list_count=get_list_count,
        resource=resource,
        resource_parent=resource_parent,
        get_resource_parent_id=get_resource_parent_id,
    ):
        async def _test_list_endpoint(
            self,
            authentication=authentication,
            list_count=list_count,
            get_list_count=get_list_count,
            permissions=permissions,
            resource=resource,
            resource_parent=resource_parent,
            get_resource_parent_id=get_resource_parent_id,
        ):
            await self.build_test_list_endpoint(
                authentication=authentication,
                list_count=list_count,
                get_list_count=get_list_count,
                permissions=permissions,
                resource=resource,
                resource_parent=resource_parent,
                resource_parent_id=get_resource_parent_id(self) if get_resource_parent_id else None,
            )
        return _test_list_endpoint

    test_class.test_list_endpoint = _build_test_list_endpoint()
    test_class.test_list_endpoint_with_authentication = _build_test_list_endpoint(authentication=1)
    test_class.test_list_endpoint_with_permissions = _build_test_list_endpoint(permissions=1)


def build_create_endpoint_tests(
    test_class,
    resource: str,
    build_payload: Callable[[AsyncDBTestCase], Dict],
    after_create_count: int = None,
    assert_after_create_count: Callable[[AsyncDBTestCase], None] = None,
    assert_before_create_count: Callable[[AsyncDBTestCase], None] = None,
    before_create_count: int = None,
    get_resource_parent_id: Callable[[AsyncDBTestCase], Union[int, str]] = None,
    resource_parent: str = None,
):
    def _build_test_create_endpoint(
        authentication: int = None,
        permissions: int = None,
        after_create_count=after_create_count,
        assert_after_create_count=assert_after_create_count,
        assert_before_create_count=assert_before_create_count,
        before_create_count=before_create_count,
        build_payload=build_payload,
        get_resource_parent_id=get_resource_parent_id,
        resource=resource,
        resource_parent=resource_parent,
    ):
        async def _test_create_endpoint(
            self,
            after_create_count=after_create_count,
            assert_after_create_count=assert_after_create_count,
            assert_before_create_count=assert_before_create_count,
            authentication=authentication,
            before_create_count=before_create_count,
            build_payload=build_payload,
            get_resource_parent_id=get_resource_parent_id,
            permissions=permissions,
            resource=resource,
            resource_parent=resource_parent,
        ):
            await self.build_test_create_endpoint(
                after_create_count=after_create_count,
                assert_after_create_count=assert_after_create_count,
                assert_before_create_count=assert_before_create_count,
                authentication=authentication,
                before_create_count=before_create_count,
                payload=build_payload(self),
                permissions=permissions,
                resource=resource,
                resource_parent=resource_parent,
                resource_parent_id=get_resource_parent_id(self) if get_resource_parent_id else None,
            )
        return _test_create_endpoint

    test_class.test_create_endpoint = _build_test_create_endpoint()
    test_class.test_create_endpoint_with_authentication = _build_test_create_endpoint(
        authentication=1,
    )
    test_class.test_create_endpoint_with_permissions = _build_test_create_endpoint(permissions=1)


def build_detail_endpoint_tests(
    test_class,
    resource: str,
    get_resource_id: Callable[[AsyncDBTestCase], Union[int, str]],
    resource_parent: str = None,
    get_resource_parent_id: Callable[[AsyncDBTestCase], Union[int, str]] = None,
):
    def _build_test_detail_endpoint(
        authentication: int = None,
        permissions: int = None,
        get_resource_id=get_resource_id,
        get_resource_parent_id=get_resource_parent_id,
        resource=resource,
        resource_parent=resource_parent,
    ):
        async def _test_detail_endpoint(
            self,
            authentication=authentication,
            get_resource_id=get_resource_id,
            get_resource_parent_id=get_resource_parent_id,
            permissions=permissions,
            resource=resource,
            resource_parent=resource_parent,
        ):
            await self.build_test_detail_endpoint(
                authentication=authentication,
                permissions=permissions,
                resource=resource,
                resource_id=get_resource_id(self),
                resource_parent=resource_parent,
                resource_parent_id=get_resource_parent_id(self) if get_resource_parent_id else None,
            )
        return _test_detail_endpoint

    test_class.test_detail_endpoint = _build_test_detail_endpoint()
    test_class.test_detail_endpoint_with_authentication = _build_test_detail_endpoint(
        authentication=1,
    )
    test_class.test_detail_endpoint_with_permissions = _build_test_detail_endpoint(permissions=1)


def build_update_endpoint_tests(
    test_class,
    resource: str,
    get_resource_id: Callable[[AsyncDBTestCase], Union[int, str]],
    build_payload: Callable[[AsyncDBTestCase], Dict],
    get_model_before_update: Callable[[AsyncDBTestCase], Any] = None,
    assert_after_update: Callable[[AsyncDBTestCase, Dict, Any], None] = None,
    get_resource_parent_id: Callable[[AsyncDBTestCase], Union[int, str]] = None,
    resource_parent: str = None,
):
    def _build_test_update_endpoint(
        authentication: int = None,
        permissions: int = None,
        assert_after_update=assert_after_update,
        get_model_before_update=get_model_before_update,
        build_payload=build_payload,
        get_resource_id=get_resource_id,
        get_resource_parent_id=get_resource_parent_id,
        resource=resource,
        resource_parent=resource_parent,
    ):
        async def _test_update_endpoint(
            self,
            assert_after_update=assert_after_update,
            get_model_before_update=get_model_before_update,
            authentication=authentication,
            build_payload=build_payload,
            get_resource_id=get_resource_id,
            get_resource_parent_id=get_resource_parent_id,
            permissions=permissions,
            resource=resource,
            resource_parent=resource_parent,
        ):
            await self.build_test_update_endpoint(
                assert_after_update=assert_after_update,
                get_model_before_update=get_model_before_update,
                authentication=authentication,
                payload=build_payload(self),
                permissions=permissions,
                resource=resource,
                resource_id=get_resource_id(self),
                resource_parent=resource_parent,
                resource_parent_id=get_resource_parent_id(self) if get_resource_parent_id else None,
            )
        return _test_update_endpoint

    test_class.test_update_endpoint = _build_test_update_endpoint()
    test_class.test_update_endpoint_with_authentication = _build_test_update_endpoint(
        authentication=1,
    )
    test_class.test_update_endpoint_with_permissions = _build_test_update_endpoint(permissions=1)


def build_delete_endpoint_tests(
    test_class,
    resource: str,
    get_resource_id: Callable[[AsyncDBTestCase], Union[int, str]],
    after_delete_count: int = None,
    assert_after_delete_count: Callable[[AsyncDBTestCase], None] = None,
    assert_before_delete_count: Callable[[AsyncDBTestCase], None] = None,
    before_delete_count: int = None,
    resource_parent: str = None,
    get_resource_parent_id: Callable[[AsyncDBTestCase], Union[int, str]] = None,
):
    def _build_test_delete_endpoint(
        authentication: int = None,
        permissions: int = None,
        get_resource_id=get_resource_id,
        get_resource_parent_id=get_resource_parent_id,
        after_delete_count=after_delete_count,
        assert_after_delete_count=assert_after_delete_count,
        assert_before_delete_count=assert_before_delete_count,
        before_delete_count=before_delete_count,
        resource=resource,
        resource_parent=resource_parent,
    ):
        async def _test_delete_endpoint(
            self,
            after_delete_count=after_delete_count,
            assert_after_delete_count=assert_after_delete_count,
            assert_before_delete_count=assert_before_delete_count,
            authentication=authentication,
            before_delete_count=before_delete_count,
            get_resource_id=get_resource_id,
            get_resource_parent_id=get_resource_parent_id,
            permissions=permissions,
            resource=resource,
            resource_parent=resource_parent,
        ):
            await self.build_test_delete_endpoint(
                after_delete_count=after_delete_count,
                assert_after_delete_count=assert_after_delete_count,
                assert_before_delete_count=assert_before_delete_count,
                authentication=authentication,
                before_delete_count=before_delete_count,
                permissions=permissions,
                resource=resource,
                resource_id=get_resource_id(self),
                resource_parent=resource_parent,
                resource_parent_id=get_resource_parent_id(self) if get_resource_parent_id else None,
            )
        return _test_delete_endpoint

    test_class.test_delete_endpoint = _build_test_delete_endpoint()
    test_class.test_delete_endpoint_with_authentication = _build_test_delete_endpoint(
        authentication=1,
    )
    test_class.test_delete_endpoint_with_permissions = _build_test_delete_endpoint(permissions=1)


class BaseAPIEndpointTest(AsyncDBTestCase):
    def setUp(self):
        self.faker = Faker()
        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
        )
        self.user = User.create(username=self.faker.unique.name())

    def tearDown(self):
        for pipeline_uuid in Pipeline.get_all_pipelines(self.repo_path):
            pipeline = Pipeline.get(pipeline_uuid)
            if pipeline:
                pipeline.delete()

        Role.query.delete()
        RolePermission.query.delete()
        User.query.delete()
        UserRole.query.delete()

    async def build_test_list_endpoint(
        self,
        resource: str,
        list_count: int = None,
        get_list_count: Callable[[AsyncDBTestCase], int] = None,
        authentication: int = None,
        permissions: int = None,
        resource_parent: str = None,
        resource_parent_id: Union[int, str] = None,
    ):
        self.__create_authentications(
            resource,
            access_for_authentication=PermissionAccess.VIEWER,
            access_for_permissions=Permission.add_accesses([
                PermissionAccess.LIST,
                PermissionAccess.READ_ALL,
            ]),
            authentication=authentication,
            permissions=permissions,
        )

        with patch(
            'mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION',
            authentication or permissions or 0,
        ):
            with patch(
                'mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS',
                permissions or 0,
            ):
                base_operation = BaseOperation(
                    action=OperationType.LIST,
                    resource=resource,
                    resource_parent=resource_parent,
                    resource_parent_id=resource_parent_id,
                    user=self.user if authentication or permissions else None,
                )

                response = await base_operation.execute()

                self.assertEqual(
                    len(response[resource]),
                    get_list_count(self) if get_list_count else list_count,
                )

    async def build_test_create_endpoint(
        self,
        resource: str,
        payload: Dict,
        after_create_count: int = None,
        assert_after_create_count: Callable[[AsyncDBTestCase], None] = None,
        assert_before_create_count: Callable[[AsyncDBTestCase], None] = None,
        authentication: int = None,
        before_create_count: int = None,
        permissions: int = None,
        resource_parent: str = None,
        resource_parent_id: Union[int, str] = None,
    ):
        self.__create_authentications(
            resource,
            access_for_authentication=PermissionAccess.EDITOR,
            access_for_permissions=Permission.add_accesses([
                PermissionAccess.CREATE,
                PermissionAccess.READ_ALL,
                PermissionAccess.WRITE_ALL,
            ]),
            authentication=authentication,
            permissions=permissions,
        )

        with patch(
            'mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION',
            authentication or permissions or 0,
        ):
            with patch(
                'mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS',
                permissions or 0,
            ):
                base_operation = BaseOperation(
                    action=OperationType.CREATE,
                    payload={
                        singularize(resource): payload,
                    },
                    resource=resource,
                    resource_parent=resource_parent,
                    resource_parent_id=resource_parent_id,
                    user=self.user if authentication or permissions else None,
                )

                before_count = None
                if assert_before_create_count is not None:
                    self.assertTrue(assert_before_create_count(self))
                else:
                    before_count = len(get_resource(resource).model_class.all())
                    self.assertEqual(
                        before_count,
                        before_create_count if before_create_count is not None else 0,
                    )

                response = await base_operation.execute()
                self.assertIsNone(response.get('error'))

                after_count = None
                if assert_after_create_count is not None:
                    self.assertTrue(assert_after_create_count(self))
                else:
                    after_count = len(get_resource().model_class.all())
                    self.assertEqual(
                        after_count,
                        after_create_count if after_create_count is not None else before_count + 1,
                    )

    async def build_test_detail_endpoint(
        self,
        resource: str,
        resource_id: Union[int, str],
        authentication: int = None,
        permissions: int = None,
        resource_parent: str = None,
        resource_parent_id: Union[int, str] = None,
    ):
        self.__create_authentications(
            resource,
            access_for_authentication=PermissionAccess.VIEWER,
            access_for_permissions=Permission.add_accesses([
                PermissionAccess.DETAIL,
                PermissionAccess.READ_ALL,
            ]),
            authentication=authentication,
            permissions=permissions,
        )

        with patch(
            'mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION',
            authentication or permissions or 0,
        ):
            with patch(
                'mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS',
                permissions or 0,
            ):
                base_operation = BaseOperation(
                    action=OperationType.DETAIL,
                    pk=resource_id,
                    resource=resource,
                    resource_parent=resource_parent,
                    resource_parent_id=resource_parent_id,
                    user=self.user if authentication or permissions else None,
                )

                response = await base_operation.execute()

                self.assertIsNotNone(response[singularize(resource)])

    async def build_test_update_endpoint(
        self,
        resource: str,
        resource_id: Union[int, str],
        payload: Dict,
        get_model_before_update: Callable[[AsyncDBTestCase], Any] = None,
        assert_after_update: Callable[[AsyncDBTestCase], None] = None,
        authentication: int = None,
        permissions: int = None,
        resource_parent: str = None,
        resource_parent_id: Union[int, str] = None,
    ):
        self.__create_authentications(
            resource,
            access_for_authentication=PermissionAccess.EDITOR,
            access_for_permissions=Permission.add_accesses([
                PermissionAccess.READ_ALL,
                PermissionAccess.UPDATE,
                PermissionAccess.WRITE_ALL,
            ]),
            authentication=authentication,
            permissions=permissions,
        )

        with patch(
            'mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION',
            authentication or permissions or 0,
        ):
            with patch(
                'mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS',
                permissions or 0,
            ):
                base_operation = BaseOperation(
                    action=OperationType.UPDATE,
                    payload={
                        singularize(resource): payload,
                    },
                    pk=resource_id,
                    resource=resource,
                    resource_parent=resource_parent,
                    resource_parent_id=resource_parent_id,
                    user=self.user if authentication or permissions else None,
                )

                updated_at = None
                if assert_after_update is None:
                    model = get_resource(resource).model_class.get(resource_id)
                    if hasattr(model, 'updated_at'):
                        updated_at = model.updated_at

                model_before_update = None
                if assert_after_update is not None:
                    if get_model_before_update is not None:
                        model_before_update = get_model_before_update(self)

                response = await base_operation.execute()

                self.assertIsNotNone(response[singularize(resource)])

                if assert_after_update is not None:
                    self.assertTrue(assert_after_update(self, payload, model_before_update))
                else:
                    model = get_resource(resource).model_class.get(resource_id)
                    if updated_at is not None:
                        self.assertNotEqual(updated_at, model.updated_at)
                    else:
                        for k, v in payload.items():
                            self.assertNotEqual(getattr(model, k), v)

    async def build_test_delete_endpoint(
        self,
        resource: str,
        resource_id: Union[int, str],
        after_delete_count: int = None,
        assert_after_delete_count: Callable[[AsyncDBTestCase], None] = None,
        assert_before_delete_count: Callable[[AsyncDBTestCase], None] = None,
        authentication: int = None,
        before_delete_count: int = None,
        permissions: int = None,
        resource_parent: str = None,
        resource_parent_id: Union[int, str] = None,
    ):
        self.__create_authentications(
            resource,
            access_for_authentication=PermissionAccess.EDITOR,
            access_for_permissions=Permission.add_accesses([
                PermissionAccess.DELETE,
                PermissionAccess.READ_ALL,
                PermissionAccess.WRITE_ALL,
            ]),
            authentication=authentication,
            permissions=permissions,
        )

        with patch(
            'mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION',
            authentication or permissions or 0,
        ):
            with patch(
                'mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS',
                permissions or 0,
            ):
                base_operation = BaseOperation(
                    action=OperationType.DELETE,
                    pk=resource_id,
                    resource=resource,
                    resource_parent=resource_parent,
                    resource_parent_id=resource_parent_id,
                    user=self.user if authentication or permissions else None,
                )

                before_count = None
                if assert_before_delete_count is not None:
                    self.assertTrue(assert_before_delete_count(self))
                else:
                    before_count = len(get_resource(resource).model_class.all())
                    self.assertEqual(
                        before_count,
                        before_delete_count if before_delete_count is not None else 1,
                    )

                response = await base_operation.execute()
                self.assertIsNone(response.get('error'))

                after_count = None
                if assert_after_delete_count is not None:
                    self.assertTrue(assert_after_delete_count(self))
                else:
                    after_count = len(get_resource().model_class.all())
                    self.assertEqual(
                        after_count,
                        after_delete_count if after_delete_count is not None else before_count - 1,
                    )

    def __create_authentications(
        self,
        resource: str,
        access_for_authentication: PermissionAccess = None,
        access_for_permissions: PermissionAccess = None,
        authentication: int = None,
        permission_options: Dict = None,
        permissions: int = None,
    ):
        if authentication or permissions:
            role = Role.create(name=self.faker.unique.name())
            UserRole.create(role_id=role.id, user_id=self.user.id)

            if authentication:
                entity = None
                entity_id = None
                policy = get_policy(resource)(None, self.user)
                if policy:
                    tup = policy.entity
                    if tup:
                        entity, entity_id = tup

                permission = Permission.create(
                    access=access_for_authentication,
                    entity=entity,
                    entity_id=entity_id,
                )
                RolePermission.create(permission_id=permission.id, role_id=role.id)
            else:
                permission = Permission.create(
                    access=access_for_permissions,
                    entity_name=EntityName(entity_name(resource)),
                    options=permission_options,
                )
            RolePermission.create(permission_id=permission.id, role_id=role.id)
