from enum import Enum
from typing import Dict, List
from unittest.mock import patch

from mage_ai.api.constants import AttributeOperationType
from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.authentication.permissions.constants import (
    ATTRIBUTE_OPERATION_TYPE_TO_PERMISSION_ACCESS_MAPPING,
    OPERATION_TYPE_TO_PERMISSION_ACCESS_MAPPING,
    EntityName,
    PermissionAccess,
    PermissionCondition,
)
from mage_ai.orchestration.db.models.oauth import (
    Permission,
    Role,
    RolePermission,
    UserRole,
)
from mage_ai.tests.api.mixins import BootstrapMixin
from mage_ai.tests.api.operations.test_base import BaseApiTestCase

ENTITY_NAME = EntityName.Pipeline


class TestSuite(str, Enum):
    AUTHORIZED = 'authorized'
    UNAUTHORIZED = 'unauthorized'


@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
class BasePolicyWithPermissionsTest(BaseApiTestCase, BootstrapMixin):
    def bootstrap(self):
        super().bootstrap()

        self.role = Role.create(name=self.faker.name())
        UserRole.create(role_id=self.role.id, user_id=self.user.id)

    def build_policy(self, entity_name: EntityName = None):
        class CustomTestWithPermissionsPolicy(BasePolicy):
            @classmethod
            def entity_name_uuid(self):
                return entity_name or ENTITY_NAME

        model = dict(power=1)
        resource = GenericResource(model, self.user)

        return CustomTestWithPermissionsPolicy(resource, self.user)

    def create_permission(
        self,
        accesses: List[PermissionAccess],
        conditions: List[PermissionCondition] = None,
        entity_name: EntityName = None,
        options: Dict = None,
    ):
        permission = Permission.create(
            access=Permission.add_accesses(accesses),
            entity_name=entity_name or ENTITY_NAME,
            options=options,
        )
        RolePermission.create(permission_id=permission.id, role_id=self.role.id)


test_configs = []

operations = [
    OperationType.CREATE,
    OperationType.DELETE,
    OperationType.DETAIL,
    OperationType.LIST,
    OperationType.UPDATE,
]
attribute_operations = [
    AttributeOperationType.QUERY,
    AttributeOperationType.READ,
    AttributeOperationType.WRITE,
]

for idx1, attribute_operation in enumerate(attribute_operations):
    attribute_operation_unauthorized = \
        attribute_operations[-1] if idx1 == 0 else attribute_operations[idx1 - 1]

    attribute_operation_access = \
        ATTRIBUTE_OPERATION_TYPE_TO_PERMISSION_ACCESS_MAPPING[attribute_operation]

    for idx2, operation in enumerate(operations):
        operation_unauthorized = operations[-1] if idx2 == 0 else operations[idx2 - 1]

        test_configs.append((
            [(operation, operation_unauthorized)],
            [(attribute_operation, attribute_operation_unauthorized)],
            [('id', 'username')],
            [OPERATION_TYPE_TO_PERMISSION_ACCESS_MAPPING[operation], attribute_operation_access],
            [TestSuite.AUTHORIZED, TestSuite.UNAUTHORIZED],
        ))


for operation_pairs, attribute_operation_pairs, attributes_pairs, accesses, test_suites in [
    (
        [(OperationType.CREATE, OperationType.UPDATE)],
        None,
        None,
        [PermissionAccess.CREATE],
        [TestSuite.AUTHORIZED, TestSuite.UNAUTHORIZED],
    ),
    (
        [(OperationType.DELETE, OperationType.CREATE)],
        None,
        None,
        [PermissionAccess.DELETE],
        [TestSuite.AUTHORIZED, TestSuite.UNAUTHORIZED],
    ),
    (
        [(OperationType.DETAIL, OperationType.DELETE)],
        None,
        None,
        [PermissionAccess.DETAIL],
        [TestSuite.AUTHORIZED, TestSuite.UNAUTHORIZED],
    ),
    (
        [(OperationType.LIST, OperationType.DETAIL)],
        None,
        None,
        [PermissionAccess.LIST],
        [TestSuite.AUTHORIZED, TestSuite.UNAUTHORIZED],
    ),
    (
        [(OperationType.UPDATE, OperationType.LIST)],
        None,
        None,
        [PermissionAccess.UPDATE],
        [TestSuite.AUTHORIZED, TestSuite.UNAUTHORIZED],
    ),
    (
        [
            (OperationType.CREATE, None),
            (OperationType.DELETE, None),
            (OperationType.DETAIL, None),
            (OperationType.LIST, None),
            (OperationType.UPDATE, None),
        ],
        None,
        None,
        [PermissionAccess.OPERATION_ALL],
        [TestSuite.AUTHORIZED],
    ),
] + test_configs:
    for operation, operation_unauthorized in operation_pairs:
        @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
        @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
        async def _test_action(
            self,
            accesses=accesses,
            operation=operation,
            operation_unauthorized=operation_unauthorized,
            test_suites=test_suites,
        ):
            self.bootstrap()

            if TestSuite.UNAUTHORIZED in test_suites:
                error = False
                try:
                    await self.build_policy().authorize_action(operation)
                except ApiError:
                    error = True
                self.assertTrue(error)

            if TestSuite.AUTHORIZED in test_suites:
                self.create_permission(accesses)
                await self.build_policy().authorize_action(operation)

                error = False
                try:
                    await self.build_policy(
                        entity_name=EntityName.Block,
                    ).authorize_action(operation_unauthorized)
                except ApiError:
                    error = True
                self.assertTrue(error)

            if operation_unauthorized:
                error = False
                try:
                    await self.build_policy().authorize_action(operation_unauthorized)
                except ApiError:
                    error = True
                self.assertTrue(error)

            self.cleanup()

        if not attribute_operation_pairs:
            method_name = f'test_authorize_action_{operation}'
            if operation_unauthorized:
                method_name = f'{method_name}_unauthorized_action_{operation_unauthorized}'

            method_name = f'{method_name}_with_access_{Permission.add_accesses(accesses)}'

            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                _test_action,
            )

        if attribute_operation_pairs:
            for tup in attribute_operation_pairs:
                attribute_operation, attribute_operation_unauthorized = tup

                for attribute, attribute_unauthorized in attributes_pairs:
                    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
                    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
                    async def _test_authorize_attribute(
                        self,
                        accesses=accesses,
                        attribute=attribute,
                        attribute_operation=attribute_operation,
                        attribute_operation_unauthorized=attribute_operation_unauthorized,
                        attribute_unauthorized=attribute_unauthorized,
                        operation=operation,
                        operation_unauthorized=operation_unauthorized,
                        test_suites=test_suites,
                    ):
                        self.bootstrap()

                        if TestSuite.UNAUTHORIZED in test_suites:
                            error = False
                            try:
                                if AttributeOperationType.QUERY == attribute_operation:
                                    await self.build_policy().authorize_query(
                                        {
                                            attribute: 1,
                                        },
                                        api_operation_action=operation,
                                    )
                                else:
                                    await self.build_policy().authorize_attribute(
                                        attribute_operation,
                                        attribute,
                                        api_operation_action=operation,
                                    )
                            except ApiError:
                                error = True
                            self.assertTrue(error)

                        if TestSuite.AUTHORIZED in test_suites:
                            if AttributeOperationType.QUERY == attribute_operation:
                                key = 'query_attributes'
                            elif AttributeOperationType.READ == attribute_operation:
                                key = 'read_attributes'
                            elif AttributeOperationType.WRITE == attribute_operation:
                                key = 'write_attributes'

                            self.create_permission(accesses, options={
                                key: [attribute],
                            })

                            if AttributeOperationType.QUERY == attribute_operation:
                                await self.build_policy().authorize_query(
                                    {
                                        attribute: 1,
                                    },
                                    api_operation_action=operation,
                                )
                            else:
                                await self.build_policy().authorize_attribute(
                                    attribute_operation,
                                    attribute,
                                    api_operation_action=operation,
                                )

                            error = False
                            try:
                                if AttributeOperationType.QUERY == attribute_operation:
                                    await self.build_policy(
                                        entity_name=EntityName.Block,
                                    ).authorize_query(
                                        {
                                            attribute: 1,
                                        },
                                        api_operation_action=operation,
                                    )
                                else:
                                    await self.build_policy(
                                        entity_name=EntityName.Block,
                                    ).authorize_attribute(
                                        attribute_operation,
                                        attribute,
                                        api_operation_action=operation,
                                    )
                            except ApiError:
                                error = True
                            self.assertTrue(error)

                        if operation_unauthorized:
                            error = False
                            try:
                                if AttributeOperationType.QUERY == attribute_operation:
                                    await self.build_policy().authorize_query(
                                        {
                                            attribute: 1,
                                        },
                                        api_operation_action=operation_unauthorized,
                                    )
                                else:
                                    await self.build_policy().authorize_attribute(
                                        attribute_operation,
                                        attribute,
                                        api_operation_action=operation_unauthorized,
                                    )
                            except ApiError:
                                error = True
                            self.assertTrue(error)

                        if attribute_unauthorized:
                            error = False
                            try:
                                if AttributeOperationType.QUERY == attribute_operation:
                                    await self.build_policy().authorize_query(
                                        {
                                            attribute_unauthorized: 1,
                                        },
                                        api_operation_action=operation,
                                    )
                                else:
                                    await self.build_policy().authorize_attribute(
                                        attribute_operation,
                                        attribute_unauthorized,
                                        api_operation_action=operation,
                                    )
                            except ApiError:
                                error = True
                            self.assertTrue(error)

                        self.cleanup()

                    method_name = f'test_authorize_{attribute_operation}_{attribute}'
                    if attribute_operation_unauthorized:
                        method_name = \
                            f'{method_name}_unauthorized_attribute_{attribute_unauthorized}'

                    method_name = f'{method_name}_for_action_{operation}'
                    if operation_unauthorized:
                        method_name = f'{method_name}_unauthorized_action_{operation_unauthorized}'

                    method_name = f'{method_name}_with_access_{Permission.add_accesses(accesses)}'

                    setattr(
                        BasePolicyWithPermissionsTest,
                        method_name,
                        _test_authorize_attribute,
                    )
