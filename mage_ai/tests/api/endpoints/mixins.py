import importlib
import inspect
from typing import Any, Callable, Dict, List, Union
from unittest.mock import patch

import inflection
from faker import Faker

from mage_ai.api.operations.base import BaseOperation
from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.permissions.constants import EntityName, PermissionAccess
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.base import BaseModel
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    User,
    UserRole,
)
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
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
    test_uuid: str = None,
    list_count: int = None,
    get_list_count: Callable[[AsyncDBTestCase], int] = None,
    resource_parent: str = None,
    get_resource_parent_id: Callable[[AsyncDBTestCase], Union[int, str]] = None,
    result_keys_to_compare: List[str] = None,
    build_query: Callable[[AsyncDBTestCase], Dict] = None,
    build_meta: Callable[[AsyncDBTestCase], Dict] = None,
    authentication_accesses: List[PermissionAccess] = None,
    permissions_accesses: List[PermissionAccess] = None,
    permission_settings: List[Dict] = None,
):
    def _build_test_list_endpoint(
        authentication: int = None,
        permissions: int = None,
        list_count=list_count,
        get_list_count=get_list_count,
        resource=resource,
        resource_parent=resource_parent,
        result_keys_to_compare=result_keys_to_compare,
        build_query=build_query,
        build_meta=build_meta,
        get_resource_parent_id=get_resource_parent_id,
        authentication_accesses=authentication_accesses,
        permissions_accesses=permissions_accesses,
        permission_settings=permission_settings,
    ):
        async def _test_list_endpoint(
            self,
            authentication=authentication,
            list_count=list_count,
            get_list_count=get_list_count,
            permissions=permissions,
            resource=resource,
            resource_parent=resource_parent,
            result_keys_to_compare=result_keys_to_compare,
            build_query=build_query,
            build_meta=build_meta,
            get_resource_parent_id=get_resource_parent_id,
            authentication_accesses=authentication_accesses,
            permissions_accesses=permissions_accesses,
            permission_settings=permission_settings,
        ):
            await self.build_test_list_endpoint(
                authentication=authentication,
                list_count=list_count,
                get_list_count=get_list_count,
                permissions=permissions,
                resource=resource,
                resource_parent=resource_parent,
                result_keys_to_compare=result_keys_to_compare,
                build_query=build_query,
                build_meta=build_meta,
                resource_parent_id=get_resource_parent_id(self) if get_resource_parent_id else None,
                authentication_accesses=authentication_accesses,
                permissions_accesses=permissions_accesses,
                permission_settings=permission_settings,
            )
        return _test_list_endpoint

    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_list_endpoint',
                test_uuid if test_uuid else '',
                'with_query' if build_query else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
                f'with_list_count_{list_count}' if list_count is not None else '',
            ],
        ))),
        _build_test_list_endpoint(),
    )
    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_list_endpoint_with_authentication',
                test_uuid if test_uuid else '',
                'with_query' if build_query else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
                f'with_list_count_{list_count}' if list_count is not None else '',
            ],
        ))),
        _build_test_list_endpoint(authentication=1),
    )
    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_list_endpoint_with_permissions',
                test_uuid if test_uuid else '',
                'with_query' if build_query else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
                f'with_list_count_{list_count}' if list_count is not None else '',
            ],
        ))),
        _build_test_list_endpoint(permissions=1),
    )


def build_create_endpoint_tests(
    test_class,
    resource: str,
    build_payload: Callable[[AsyncDBTestCase], Dict],
    test_uuid: str = None,
    after_create_count: int = None,
    assert_after_create_count: Callable[[AsyncDBTestCase], None] = None,
    assert_before_create_count: Callable[[AsyncDBTestCase], None] = None,
    before_create_count: int = None,
    get_resource_parent_id: Callable[[AsyncDBTestCase], Union[int, str]] = None,
    resource_parent: str = None,
    authentication_accesses: List[PermissionAccess] = None,
    permissions_accesses: List[PermissionAccess] = None,
    permission_settings: List[Dict] = None,
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
        authentication_accesses=authentication_accesses,
        permissions_accesses=permissions_accesses,
        permission_settings=permission_settings,
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
            authentication_accesses=authentication_accesses,
            permissions_accesses=permissions_accesses,
            permission_settings=permission_settings,
        ):
            payload = build_payload(self)
            if payload and inspect.isawaitable(payload):
                payload = await payload

            await self.build_test_create_endpoint(
                after_create_count=after_create_count,
                assert_after_create_count=assert_after_create_count,
                assert_before_create_count=assert_before_create_count,
                authentication=authentication,
                before_create_count=before_create_count,
                payload=payload,
                permissions=permissions,
                resource=resource,
                resource_parent=resource_parent,
                resource_parent_id=get_resource_parent_id(self) if get_resource_parent_id else None,
                authentication_accesses=authentication_accesses,
                permissions_accesses=permissions_accesses,
                permission_settings=permission_settings,
            )
        return _test_create_endpoint

    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_create_endpoint',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_create_endpoint(),
    )
    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_create_endpoint_with_authentication',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_create_endpoint(authentication=1),
    )
    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_create_endpoint_with_permissions',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_create_endpoint(permissions=1),
    )


def build_detail_endpoint_tests(
    test_class,
    resource: str,
    get_resource_id: Callable[[AsyncDBTestCase], Union[int, str]],
    test_uuid: str = None,
    resource_parent: str = None,
    get_resource_parent_id: Callable[[AsyncDBTestCase], Union[int, str]] = None,
    result_keys_to_compare: List[str] = None,
    build_query: Callable[[AsyncDBTestCase], Dict] = None,
    build_meta: Callable[[AsyncDBTestCase], Dict] = None,
    authentication_accesses: List[PermissionAccess] = None,
    permissions_accesses: List[PermissionAccess] = None,
    permission_settings: List[Dict] = None,
):
    def _build_test_detail_endpoint(
        authentication: int = None,
        permissions: int = None,
        get_resource_id=get_resource_id,
        get_resource_parent_id=get_resource_parent_id,
        resource=resource,
        resource_parent=resource_parent,
        result_keys_to_compare=result_keys_to_compare,
        build_query=build_query,
        build_meta=build_meta,
        authentication_accesses=authentication_accesses,
        permissions_accesses=permissions_accesses,
        permission_settings=permission_settings,
    ):
        async def _test_detail_endpoint(
            self,
            authentication=authentication,
            get_resource_id=get_resource_id,
            get_resource_parent_id=get_resource_parent_id,
            permissions=permissions,
            resource=resource,
            resource_parent=resource_parent,
            result_keys_to_compare=result_keys_to_compare,
            build_query=build_query,
            build_meta=build_meta,
            authentication_accesses=authentication_accesses,
            permissions_accesses=permissions_accesses,
            permission_settings=permission_settings,
        ):
            await self.build_test_detail_endpoint(
                authentication=authentication,
                permissions=permissions,
                resource=resource,
                resource_id=get_resource_id(self),
                resource_parent=resource_parent,
                result_keys_to_compare=result_keys_to_compare,
                build_query=build_query,
                build_meta=build_meta,
                resource_parent_id=get_resource_parent_id(self) if get_resource_parent_id else None,
                authentication_accesses=authentication_accesses,
                permissions_accesses=permissions_accesses,
                permission_settings=permission_settings,
            )
        return _test_detail_endpoint

    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_detail_endpoint',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_detail_endpoint(),
    )
    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_detail_endpoint_with_authentication',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_detail_endpoint(authentication=1),
    )
    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_detail_endpoint_with_permissions',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_detail_endpoint(permissions=1),
    )


def build_update_endpoint_tests(
    test_class,
    resource: str,
    get_resource_id: Callable[[AsyncDBTestCase], Union[int, str]],
    build_payload: Callable[[AsyncDBTestCase], Dict],
    test_uuid: str = None,
    get_model_before_update: Callable[[AsyncDBTestCase], Any] = None,
    assert_after_update: Callable[[AsyncDBTestCase, Dict, Any], None] = None,
    get_resource_parent_id: Callable[[AsyncDBTestCase], Union[int, str]] = None,
    resource_parent: str = None,
    authentication_accesses: List[PermissionAccess] = None,
    permissions_accesses: List[PermissionAccess] = None,
    permission_settings: List[Dict] = None,
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
        authentication_accesses=authentication_accesses,
        permissions_accesses=permissions_accesses,
        permission_settings=permission_settings,
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
            authentication_accesses=authentication_accesses,
            permissions_accesses=permissions_accesses,
            permission_settings=permission_settings,
        ):
            payload = build_payload(self)
            if payload and inspect.isawaitable(payload):
                payload = await payload

            await self.build_test_update_endpoint(
                assert_after_update=assert_after_update,
                get_model_before_update=get_model_before_update,
                authentication=authentication,
                payload=payload,
                permissions=permissions,
                resource=resource,
                resource_id=get_resource_id(self),
                resource_parent=resource_parent,
                resource_parent_id=get_resource_parent_id(self) if get_resource_parent_id else None,
                authentication_accesses=authentication_accesses,
                permissions_accesses=permissions_accesses,
                permission_settings=permission_settings,
            )
        return _test_update_endpoint

    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_update_endpoint',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_update_endpoint(),
    )
    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_update_endpoint_with_authentication',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_update_endpoint(authentication=1),
    )
    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_update_endpoint_with_permissions',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_update_endpoint(permissions=1),
    )


def build_delete_endpoint_tests(
    test_class,
    resource: str,
    get_resource_id: Callable[[AsyncDBTestCase], Union[int, str]],
    test_uuid: str = None,
    after_delete_count: int = None,
    assert_after_delete_count: Callable[[AsyncDBTestCase], None] = None,
    assert_before_delete_count: Callable[[AsyncDBTestCase], None] = None,
    before_delete_count: int = None,
    resource_parent: str = None,
    get_resource_parent_id: Callable[[AsyncDBTestCase], Union[int, str]] = None,
    authentication_accesses: List[PermissionAccess] = None,
    permissions_accesses: List[PermissionAccess] = None,
    permission_settings: List[Dict] = None,
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
        authentication_accesses=authentication_accesses,
        permissions_accesses=permissions_accesses,
        permission_settings=permission_settings,
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
            authentication_accesses=authentication_accesses,
            permissions_accesses=permissions_accesses,
            permission_settings=permission_settings,
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
                authentication_accesses=authentication_accesses,
                permissions_accesses=permissions_accesses,
                permission_settings=permission_settings,
            )
        return _test_delete_endpoint

    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_delete_endpoint',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_delete_endpoint(),
    )
    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_delete_endpoint_with_authentication',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_delete_endpoint(authentication=1),
    )
    setattr(
        test_class,
        '_'.join(list(filter(
            lambda x: x,
            [
                'test_delete_endpoint_with_permissions',
                test_uuid if test_uuid else '',
                f'with_parent_{resource_parent}' if resource_parent else '',
            ],
        ))),
        _build_test_delete_endpoint(permissions=1),
    )


class BaseAPIEndpointTest(AsyncDBTestCase):
    def setUp(self):
        self.faker = Faker()
        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
        )
        self.user = User.create(username=self.faker.unique.name())
        self.authentication = None
        self.permissions = None

    def tearDown(self):
        for pipeline_uuid in Pipeline.get_all_pipelines(self.repo_path):
            pipeline = Pipeline.get(pipeline_uuid)
            if pipeline:
                pipeline.delete()

        BlockRun.query.delete()
        Permission.query.delete()
        PipelineRun.query.delete()
        PipelineSchedule.query.delete()
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
        result_keys_to_compare: List[str] = None,
        build_query: Callable[[AsyncDBTestCase], Dict] = None,
        build_meta: Callable[[AsyncDBTestCase], Dict] = None,
        authentication_accesses: List[PermissionAccess] = None,
        permissions_accesses: List[PermissionAccess] = None,
        permission_settings: List[Dict] = None,
    ):
        self.authentication = authentication
        self.permissions = permissions
        self.__create_authentications(
            resource,
            access_for_authentication=Permission.add_accesses([
                PermissionAccess.VIEWER,
            ] + (authentication_accesses or [])),
            access_for_permissions=Permission.add_accesses([
                PermissionAccess.LIST,
                PermissionAccess.QUERY_ALL,
                PermissionAccess.READ_ALL,
            ] + (permissions_accesses or [])),
            authentication=authentication,
            permissions=permissions,
            permission_settings=permission_settings,
        )

        with patch(
            'mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION',
            authentication or permissions or 0,
        ):
            with patch(
                'mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS',
                permissions or 0,
            ):
                meta = None
                if build_meta:
                    meta = build_meta(self)
                    if meta and inspect.isawaitable(meta):
                        meta = await meta
                query = None
                if build_query:
                    query = build_query(self)
                    if query and inspect.isawaitable(query):
                        query = await query

                base_operation = BaseOperation(
                    action=OperationType.LIST,
                    meta=meta,
                    query=query,
                    resource=resource,
                    resource_parent=resource_parent,
                    resource_parent_id=resource_parent_id,
                    user=self.user if authentication or permissions else None,
                )

                response = await base_operation.execute()
                results = response[resource]

                self.assertEqual(
                    len(results),
                    get_list_count(self) if get_list_count else list_count,
                )

                if result_keys_to_compare:
                    for result in results:
                        validations = [k in result for k in result_keys_to_compare]
                        self.assertTrue(all(validations))

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
        authentication_accesses: List[PermissionAccess] = None,
        permissions_accesses: List[PermissionAccess] = None,
        permission_settings: List[Dict] = None,
    ):
        self.authentication = authentication
        self.permissions = permissions
        self.__create_authentications(
            resource,
            access_for_authentication=Permission.add_accesses([
                PermissionAccess.EDITOR,
            ] + (authentication_accesses or [])),
            access_for_permissions=Permission.add_accesses([
                PermissionAccess.CREATE,
                PermissionAccess.READ_ALL,
                PermissionAccess.WRITE_ALL,
            ] + (permissions_accesses or [])),
            authentication=authentication,
            permissions=permissions,
            permission_settings=permission_settings,
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
        result_keys_to_compare: List[str] = None,
        build_query: Callable[[AsyncDBTestCase], Dict] = None,
        build_meta: Callable[[AsyncDBTestCase], Dict] = None,
        authentication_accesses: List[PermissionAccess] = None,
        permissions_accesses: List[PermissionAccess] = None,
        permission_settings: List[Dict] = None,
    ):
        self.authentication = authentication
        self.permissions = permissions
        self.__create_authentications(
            resource,
            access_for_authentication=Permission.add_accesses([
                PermissionAccess.VIEWER,
            ] + (authentication_accesses or [])),
            access_for_permissions=Permission.add_accesses([
                PermissionAccess.DETAIL,
                PermissionAccess.QUERY_ALL,
                PermissionAccess.READ_ALL,
            ] + (permissions_accesses or [])),
            authentication=authentication,
            permissions=permissions,
            permission_settings=permission_settings,
        )

        with patch(
            'mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION',
            authentication or permissions or 0,
        ):
            with patch(
                'mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS',
                permissions or 0,
            ):
                meta = None
                if build_meta:
                    meta = build_meta(self)
                    if meta and inspect.isawaitable(meta):
                        meta = await meta
                query = None
                if build_query:
                    query = build_query(self)
                    if query and inspect.isawaitable(query):
                        query = await query

                base_operation = BaseOperation(
                    action=OperationType.DETAIL,
                    meta=meta,
                    pk=resource_id,
                    query=query,
                    resource=resource,
                    resource_parent=resource_parent,
                    resource_parent_id=resource_parent_id,
                    user=self.user if authentication or permissions else None,
                )

                response = await base_operation.execute()
                key = singularize(resource)
                if key not in response:
                    raise Exception(response)

                result = response[key]

                self.assertIsNotNone(result)

                if result_keys_to_compare:
                    validations = [k in result for k in result_keys_to_compare]
                    self.assertTrue(all(validations))

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
        authentication_accesses: List[PermissionAccess] = None,
        permissions_accesses: List[PermissionAccess] = None,
        permission_settings: List[Dict] = None,
    ):
        self.authentication = authentication
        self.permissions = permissions
        self.__create_authentications(
            resource,
            access_for_authentication=Permission.add_accesses([
                PermissionAccess.EDITOR,
            ] + (authentication_accesses or [])),
            access_for_permissions=Permission.add_accesses([
                PermissionAccess.READ_ALL,
                PermissionAccess.UPDATE,
                PermissionAccess.WRITE_ALL,
            ] + (permissions_accesses or [])),
            authentication=authentication,
            permissions=permissions,
            permission_settings=permission_settings,
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
                        if model_before_update and inspect.isawaitable(model_before_update):
                            model_before_update = await model_before_update

                        if model_before_update and isinstance(model_before_update, BaseModel):
                            current_attributes = dict(model_before_update.__dict__)
                            current_attributes.pop('_sa_instance_state')
                            model_before_update = model_before_update.__class__(
                                **current_attributes,
                            )

                response = await base_operation.execute()
                key = singularize(resource)
                if key not in response:
                    raise Exception(response)

                result = response[key]

                self.assertIsNotNone(result)

                if assert_after_update is not None:
                    validation = assert_after_update(self, result, model_before_update)
                    if validation and inspect.isawaitable(validation):
                        validation = await validation
                    self.assertTrue(validation)
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
        authentication_accesses: List[PermissionAccess] = None,
        permissions_accesses: List[PermissionAccess] = None,
        permission_settings: List[Dict] = None,
    ):
        self.authentication = authentication
        self.permissions = permissions
        self.__create_authentications(
            resource,
            access_for_authentication=Permission.add_accesses([
                PermissionAccess.EDITOR,
            ] + (authentication_accesses or [])),
            access_for_permissions=Permission.add_accesses([
                PermissionAccess.DELETE,
                PermissionAccess.READ_ALL,
                PermissionAccess.WRITE_ALL,
            ] + (permissions_accesses or [])),
            authentication=authentication,
            permissions=permissions,
            permission_settings=permission_settings,
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
        permission_settings: List[Dict] = None,
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

                if permission_settings:
                    for permission_setting in permission_settings:
                        permission_more = Permission.create(**permission_setting)
                        RolePermission.create(permission_id=permission_more.id, role_id=role.id)

            RolePermission.create(permission_id=permission.id, role_id=role.id)
