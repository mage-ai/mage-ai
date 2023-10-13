from typing import Dict

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
        query: Dict = None,
    ) -> BaseOperation:

        class PowerPresenter(BasePresenter):
            default_attributes = [
                'id',
                'name',
                'power',
            ]

        class PowerPolicy(BasePolicy):
            @classmethod
            def entity_name_uuid(self) -> EntityName:
                return EntityName.Log

        PowerPolicy.allow_actions(
            [
                OperationType.LIST,
            ],
            scopes=[
                OauthScopeType.CLIENT_PRIVATE,
            ],
        )

        PowerPolicy.allow_read(
            PowerPresenter.default_attributes,
            on_action=[
                OperationType.LIST,
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

        class CustomBaseOperation(BaseOperation):
            def _BaseOperation__policy_class(self):
                return PowerPolicy

            def _BaseOperation__resource_class(self):
                return PowerResource

            def _BaseOperation__presenter_class(self):
                return PowerPresenter

        return CustomBaseOperation(
            action=action,
            query=query,
            resource=self.resource_name,
            user=self.user,
        )

    def run_test_query_getter(self):
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

    def run_test_query_setter(self):
        operation = self.build_operation(query=self.query)
        self.assertEqual(operation.query, self.query)

        query = dict(name=self.faker.unique.name())
        operation.query = query
        self.assertEqual(operation.query, query)

    async def run_test_execute_list(self):
        operation = self.build_operation(action=OperationType.LIST)
        response = await operation.execute()
        self.assertEqual(
            response['logs'],
            [ignore_keys(p, ['spell_id']) for p in self.logs],
        )

    async def run_test_execute_list_with_query(self):
        operation = self.build_operation(
            action=OperationType.LIST,
            query=dict(id=self.logs[0]['id']),
        )
        response = await operation.execute()
        self.assertEqual(
            response['logs'],
            [ignore_keys(p, ['spell_id']) for p in self.logs[:1]],
        )


class Base(AsyncDBTestCase, BaseOperationMixin):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.faker = Faker()
