from typing import Dict
from unittest.mock import MagicMock, call, patch

from faker import Faker

from mage_ai.api.oauth_scope import OauthScopeType
from mage_ai.api.operations.base import BaseOperation
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.authentication.permissions.constants import EntityName
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    User,
    UserRole,
)
from mage_ai.shared.array import find
from mage_ai.shared.hash import ignore_keys, merge_dict
from mage_ai.tests.base_test import AsyncDBTestCase


class BaseOperationMixin:
    def set_up(self):
        self.resource_name = 'logs'
        self.resource_parent_name = 'tags'
        self.query = dict(
            name=self.faker.unique.name(),
            power=self.faker.unique.random_int(),
            spells=[
                self.faker.unique.name(),
                self.faker.unique.random_int(),
            ],
        )
        self.user = User.create(username=self.faker.unique.name())

        self.tags = [
            dict(
                id=self.faker.unique.random_int(),
                name=self.faker.unique.name(),
            ),
            dict(
                id=self.faker.unique.random_int(),
                name=self.faker.unique.name(),
            ),
        ]
        self.logs = [
            dict(
                id=self.faker.unique.random_int(),
                name=self.faker.unique.name(),
                power=self.faker.unique.random_int(),
                spell_id=self.tags[0]['id'],
            ),
            dict(
                id=self.faker.unique.random_int(),
                name=self.faker.unique.name(),
                power=self.faker.unique.random_int(),
                spell_id=self.tags[1]['id'],
            ),
        ]

    def tear_down(self):
        Permission.query.delete()
        Role.query.delete()
        RolePermission.query.delete()
        User.query.delete()
        UserRole.query.delete()

    def build_operation(
        self,
        action: OperationType = None,
        payload: Dict = None,
        pk: int = None,
        query: Dict = None,
        resource_parent: str = None,
        resource_parent_id: int = None,
    ) -> BaseOperation:

        class PowerPresenter(BasePresenter):
            default_attributes = [
                'id',
                'name',
                'power',
            ]

        PowerPresenter.register_formats(
            [
                OperationType.CREATE,
            ],
            PowerPresenter.default_attributes + [
                'spell_id',
            ],
        )

        PowerPresenter.register_formats(
            [
                OperationType.UPDATE,
            ],
            [
                'name',
                'power',
                'spell_id',
            ],
        )

        PowerPresenter.register_formats(
            [
                OperationType.DELETE,
            ],
            [
                'success',
            ],
        )

        class PowerPolicy(BasePolicy):
            @classmethod
            def entity_name_uuid(self) -> EntityName:
                return EntityName.Log

        PowerPolicy.allow_actions(
            [
                OperationType.CREATE,
                OperationType.DELETE,
                OperationType.DETAIL,
                OperationType.LIST,
                OperationType.UPDATE,
            ],
            scopes=[
                OauthScopeType.CLIENT_PRIVATE,
            ],
        )

        PowerPolicy.allow_read(
            PowerPresenter.default_attributes,
            on_action=[
                OperationType.CREATE,
                OperationType.DETAIL,
                OperationType.LIST,
                OperationType.UPDATE,
            ],
            scopes=[
                OauthScopeType.CLIENT_PRIVATE,
            ],
        )

        PowerPolicy.allow_read(
            [
                'spell_id',
            ],
            on_action=[
                OperationType.CREATE,
                OperationType.UPDATE,
            ],
            scopes=[
                OauthScopeType.CLIENT_PRIVATE,
            ],
        )

        PowerPolicy.allow_read(
            [
                'success',
            ],
            on_action=[
                OperationType.DELETE,
            ],
            scopes=[
                OauthScopeType.CLIENT_PRIVATE,
            ],
        )

        PowerPolicy.allow_write(
            [
                'id',
                'name',
                'power',
                'spell_id',
            ],
            on_action=[
                OperationType.CREATE,
            ],
            scopes=[
                OauthScopeType.CLIENT_PRIVATE,
            ],
        )

        PowerPolicy.allow_write(
            [
                'name',
                'power',
                'spell_id',
            ],
            on_action=[
                OperationType.UPDATE,
            ],
            scopes=[
                OauthScopeType.CLIENT_PRIVATE,
            ],
        )

        PowerPolicy.allow_query(
            [
                'id',
            ],
            on_action=[
                OperationType.LIST,
            ],
            scopes=[
                OauthScopeType.CLIENT_PRIVATE,
            ],
        )

        class PowerResource(GenericResource):
            @classmethod
            def policy_class(self):
                return PowerPolicy

            @classmethod
            def presenter_class(self):
                return PowerPresenter

            @classmethod
            def collection(cls, query, _meta, user, **kwargs):
                models = list(filter(
                    lambda x, query=query: not query or
                    all([x[k] == v for k, v in query.items()]),
                    self.logs,
                ))

                return cls.build_result_set(
                    models,
                    user,
                    **kwargs,
                )

            @classmethod
            async def create(cls, payload, user, **kwargs):
                cls.model = payload
                return cls(cls.model, user, **kwargs)

            @classmethod
            async def member(cls, pk, user, **kwargs):
                model = find(lambda x, pk2=pk: x['id'] == pk2, self.logs)

                return cls(model, user, **kwargs)

            async def update(cls, payload, **kwargs):
                cls.model = payload

            async def delete(cls, **kwargs):
                cls.model = dict(success=1)

        class CustomBaseOperation(BaseOperation):
            def _BaseOperation__policy_class(self):
                return PowerPolicy

            def _BaseOperation__resource_class(self):
                return PowerResource

            def _BaseOperation__presenter_class(self):
                return PowerPresenter

        return CustomBaseOperation(
            action=action,
            payload=payload,
            pk=pk,
            query=query,
            resource=self.resource_name,
            resource_parent=resource_parent,
            resource_parent_id=resource_parent_id,
            user=self.user,
        )

    def parent_resource_options(self) -> Dict:
        return dict(
            resource_parent=self.resource_name,
            resource_parent_id=self.logs[0]['id'],
        )

    async def run_mixin_test_query_getter(self):
        operation = self.build_operation(query=merge_dict(self.query, dict(
            shields=[
                'false',
                False,
            ],
            spear='false',
            sword='true',
            weapons=[
                'true',
                True,
            ],
        )))
        self.assertEqual(operation.query, merge_dict(self.query, dict(
            shields=[
                False,
                False,
            ],
            spear='false',
            sword='true',
            weapons=[
                True,
                True,
            ],
        )))

    @patch('mage_ai.api.operations.base.db_connection')
    async def run_mixin_test_cache_start_and_stop(self, mock_db_connection):
        pass
        mock_start_cache = MagicMock()
        mock_stop_cache = MagicMock()
        mock_db_connection.start_cache = mock_start_cache
        mock_db_connection.stop_cache = mock_stop_cache

        operation = self.build_operation(action=OperationType.LIST)
        await operation.execute()

        mock_db_connection.assert_has_calls([
            call.start_cache(),
            call.stop_cache(),
        ], any_order=False)
        pass

    async def run_mixin_test_query_setter(self):
        operation = self.build_operation(query=self.query)
        self.assertEqual(operation.query, self.query)

        query = dict(name=self.faker.unique.name())
        operation.query = query
        self.assertEqual(operation.query, query)

    async def run_mixin_test_execute_list(self, **kwargs):
        operation = self.build_operation(action=OperationType.LIST, **kwargs)
        response = await operation.execute()
        self.assertEqual(
            response['logs'],
            [ignore_keys(p, ['spell_id']) for p in self.logs],
        )

    async def run_mixin_test_execute_list_with_query(self, **kwargs):
        operation = self.build_operation(
            action=OperationType.LIST,
            query=dict(id=self.logs[0]['id']),
            **kwargs,
        )
        response = await operation.execute()
        self.assertEqual(
            response['logs'],
            [ignore_keys(p, ['spell_id']) for p in self.logs[:1]],
        )

    async def run_mixin_test_execute_create(self, **kwargs):
        operation = self.build_operation(
            action=OperationType.CREATE,
            payload=dict(log=self.logs[1]),
            **kwargs,
        )
        response = await operation.execute()
        self.assertEqual(
            response['log'],
            self.logs[1],
        )

    async def run_mixin_test_execute_detail(self, **kwargs):
        operation = self.build_operation(
            action=OperationType.DETAIL,
            pk=self.logs[1]['id'],
            **kwargs,
        )
        response = await operation.execute()
        self.assertEqual(
            response['log'],
            ignore_keys(self.logs[1], ['spell_id']),
        )

    async def run_mixin_test_execute_update(self, **kwargs):
        operation = self.build_operation(
            action=OperationType.UPDATE,
            payload=dict(log=ignore_keys(self.logs[0], ['id'])),
            pk=self.logs[1]['id'],
            **kwargs,
        )
        response = await operation.execute()
        self.assertEqual(
            response['log'],
            ignore_keys(self.logs[0], ['id']),
        )

    async def run_mixin_test_execute_delete(self, **kwargs):
        operation = self.build_operation(
            action=OperationType.DELETE,
            pk=self.logs[1]['id'],
            **kwargs,
        )
        response = await operation.execute()
        self.assertEqual(
            response['log'],
            dict(success=1),
        )


class Base(AsyncDBTestCase, BaseOperationMixin):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.faker = Faker()
