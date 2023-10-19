import secrets
from enum import Enum
from typing import Any, Callable, Dict, List, Union
from unittest.mock import patch

from mage_ai.api.constants import (
    ATTRIBUTE_OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING,
    ATTRIBUTE_OPERATION_TYPE_TO_ACCESS_MAPPING,
    OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING,
    OPERATION_TYPE_TO_ACCESS_MAPPING,
    AttributeOperationType,
)
from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import OperationType
from mage_ai.authentication.permissions.constants import (
    EntityName,
    PermissionAccess,
    PermissionCondition,
)
from mage_ai.orchestration.db.models.oauth import Permission, Role, User, UserRole
from mage_ai.shared.array import find
from mage_ai.shared.hash import index_by, merge_dict
from mage_ai.tests.api.mixins import BootstrapMixin
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.api.policies.permissions.mixins import PermissionsMixin


class TestSuite(str, Enum):
    AUTHORIZED = 'AUTHORIZED'
    DISABLED = 'DISABLED'
    INVERSE = 'INVERSE'
    UNAUTHORIZED = 'UNAUTHORIZED'
    UNAUTHORIZED_FOR_ANOTHER_ENTITY = 'UNAUTHORIZED_FOR_ANOTHER_ENTITY'
    UNAUTHORIZED_WITH_NO_PERMISSIONS = 'UNAUTHORIZED_WITH_NO_PERMISSIONS'


class BasePolicyWithPermissionsTest(BaseApiTestCase, BootstrapMixin, PermissionsMixin):
    def setUp(self):
        super().setUp()
        self.role = Role.create(name=secrets.token_urlsafe())
        UserRole.create(role_id=self.role.id, user_id=self.user.id)


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

entity_names = [en for en in EntityName]

for entity_name in [
    EntityName.User,
]:
    for operation in operations:
        operation_access = OPERATION_TYPE_TO_ACCESS_MAPPING[operation]

        def build_test_action(
            access,
            operation_type,
            current_user=None,
            entity_name=entity_name,
            get_entity_id: Callable[[Any], Union[int, str]] = None,
            permission_options: Dict = None,
            test_suites: List[TestSuite] = None,
        ):
            @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
            @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
            async def _test_action(
                self,
                access=access,
                current_user=current_user,
                entity_name=entity_name,
                get_entity_id=get_entity_id,
                operation_type=operation_type,
                permission_options=permission_options,
                test_suites=test_suites,
            ):
                self.bootstrap()

                # Unauthorized because the user has no permissions.
                if not test_suites or TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS in test_suites:
                    error = False
                    try:
                        await self.build_policy(
                            current_user=current_user,
                            entity_name=entity_name,
                        ).authorize_action(
                            operation_type,
                        )
                    except ApiError:
                        error = True
                    self.assertTrue(error)

                self.create_permission(
                    [access],
                    entity_name=entity_name,
                    entity_id=get_entity_id(self) if get_entity_id else None,
                    options=permission_options,
                )

                # Authorized
                if not test_suites or TestSuite.AUTHORIZED in test_suites:
                    await self.build_policy(
                        current_user=current_user,
                        entity_name=entity_name,
                    ).authorize_action(
                        operation_type,
                    )

                if test_suites and TestSuite.INVERSE in test_suites:
                    error = False
                    try:
                        await self.build_policy(
                            current_user=current_user,
                            entity_name=entity_name,
                        ).authorize_action(
                            operation_type,
                        )
                    except ApiError:
                        error = True
                    self.assertTrue(error)

                # Unauthorized for a different entity.
                if not test_suites or TestSuite.UNAUTHORIZED_FOR_ANOTHER_ENTITY in test_suites:
                    error = False
                    try:
                        await self.build_policy(
                            current_user=current_user,
                            entity_name=find(
                                lambda x, entity_name=entity_name: x != entity_name,
                                entity_names,
                            ),
                        ).authorize_action(operation_type)
                    except ApiError:
                        error = True
                    self.assertTrue(error)

                # Unauthorized for a different operation.
                if not test_suites or TestSuite.UNAUTHORIZED in test_suites:
                    error = False
                    try:
                        await self.build_policy(
                            current_user=current_user,
                            entity_name=entity_name,
                        ).authorize_action(find(
                            lambda x: x != operation_type,
                            operations,
                        ))
                    except ApiError:
                        error = True
                    self.assertTrue(error)

                # Disable operation
                if not test_suites or TestSuite.DISABLED in test_suites:
                    self.create_permission([
                        OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING[operation_type],
                    ], entity_name=entity_name)
                    error = False
                    try:
                        await self.build_policy(
                            current_user=current_user,
                            entity_name=entity_name,
                        ).authorize_action(
                            operation_type,
                        )
                    except ApiError:
                        error = True
                    self.assertTrue(error)

                self.cleanup()

            return _test_action

        method_name = f'test_authorize_action_{operation}_for_{entity_name}'
        method_name = f'{method_name}_with_access_{operation_access}'
        setattr(
            BasePolicyWithPermissionsTest,
            method_name,
            build_test_action(
                access=operation_access,
                operation_type=operation,
            ),
        )

        if operation in [
            OperationType.DETAIL,
            OperationType.LIST,
        ]:
            for group_access, test_suites in [
                (
                    PermissionAccess.ADMIN,
                    [
                        TestSuite.AUTHORIZED,
                        TestSuite.DISABLED,
                        TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                    ],
                ),
                (
                    PermissionAccess.EDITOR,
                    [
                        TestSuite.AUTHORIZED,
                        TestSuite.DISABLED,
                        TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                    ],
                ),
                (
                    PermissionAccess.OWNER,
                    [
                        TestSuite.AUTHORIZED,
                        TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                    ],
                ),
                (
                    PermissionAccess.VIEWER,
                    [
                        TestSuite.AUTHORIZED,
                        TestSuite.DISABLED,
                        TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                    ],
                ),
            ]:
                method_name = f'test_authorize_action_{operation}_for_{entity_name}'
                method_name = f'{method_name}_with_group_access_{group_access}'
                setattr(
                    BasePolicyWithPermissionsTest,
                    method_name,
                    build_test_action(
                        access=group_access,
                        operation_type=operation,
                        test_suites=test_suites,
                    ),
                )

        if operation in [
            OperationType.CREATE,
            OperationType.DELETE,
            OperationType.UPDATE,
        ]:
            for group_access, test_suites in [
                (
                    PermissionAccess.ADMIN,
                    [
                        TestSuite.AUTHORIZED,
                        TestSuite.DISABLED,
                        TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                    ],
                ),
                (
                    PermissionAccess.EDITOR,
                    [
                        TestSuite.AUTHORIZED,
                        TestSuite.DISABLED,
                        TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                    ],
                ),
                (
                    PermissionAccess.OWNER,
                    [
                        TestSuite.AUTHORIZED,
                        TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                    ],
                ),
            ]:
                method_name = f'test_authorize_action_{operation}_for_{entity_name}'
                method_name = f'{method_name}_with_group_access_{group_access}'
                setattr(
                    BasePolicyWithPermissionsTest,
                    method_name,
                    build_test_action(
                        access=group_access,
                        operation_type=operation,
                        test_suites=test_suites,
                    ),
                )

        if operation in [
            OperationType.DELETE,
            OperationType.DETAIL,
            OperationType.UPDATE,
        ]:
            method_name = f'test_authorize_action_{operation}_for_{entity_name}_and_entity_id'
            method_name = f'{method_name}_with_access_{operation_access}'
            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                build_test_action(
                    access=operation_access,
                    get_entity_id=lambda self: self.user.id,
                    operation_type=operation,
                ),
            )

            method_name = f'test_authorize_action_{operation}_for_{entity_name}_and_entity_id'
            method_name = f'{method_name}_with_access_{operation_access}_unauthorized'
            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                build_test_action(
                    access=operation_access,
                    get_entity_id=lambda self: f'not_{self.user.id}',
                    operation_type=operation,
                    test_suites=[TestSuite.INVERSE],
                ),
            )

        for access_all in [
            PermissionAccess.ALL,
            PermissionAccess.OPERATION_ALL,
        ]:
            method_name = f'test_authorize_action_{operation}_for_{entity_name}'
            method_name = f'{method_name}_with_access_{access_all}'

            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                build_test_action(
                    access=access_all,
                    operation_type=operation,
                    test_suites=[TestSuite.AUTHORIZED],
                ),
            )

        for access_disable in [
            PermissionAccess.DISABLE_OPERATION_ALL,
        ]:
            @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
            @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
            async def _test_action_with_disable_access_operation_all(
                self,
                access_disable=access_disable,
                entity_name=entity_name,
                operation=operation,
                operation_access=operation_access,
            ):
                self.bootstrap()

                # Unauthorized
                error = False
                self.create_permission([
                    access_disable,
                    operation_access,
                ], entity_name=entity_name)
                try:
                    await self.build_policy(entity_name=entity_name).authorize_action(operation)
                except ApiError:
                    error = True
                self.assertTrue(error)

                self.cleanup()

            method_name = f'test_authorize_action_{operation}_for_{entity_name}'
            method_name = f'{method_name}_with_disable_access_operation_all'

            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                _test_action_with_disable_access_operation_all,
            )

        method_name = f'test_authorize_action_{operation}_for_{entity_name}'
        method_name = f'{method_name}_with_condition_has_notebook_edit_access_0'
        setattr(
            BasePolicyWithPermissionsTest,
            method_name,
            patch(
                'mage_ai.api.policies.mixins.user_permissions.DISABLE_NOTEBOOK_EDIT_ACCESS',
                0,
            )(build_test_action(
                access=Permission.add_accesses([
                    PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                    operation_access,
                ]),
                operation_type=operation,
                permission_options=dict(conditions=[PermissionCondition.HAS_NOTEBOOK_EDIT_ACCESS]),
            ))
        )

        method_name = f'test_authorize_action_{operation}_for_{entity_name}'
        method_name = f'{method_name}_with_condition_has_notebook_edit_access_1'
        setattr(
            BasePolicyWithPermissionsTest,
            method_name,
            patch(
                'mage_ai.api.policies.mixins.user_permissions.DISABLE_NOTEBOOK_EDIT_ACCESS',
                1,
            )(build_test_action(
                access=Permission.add_accesses([
                    PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                    operation_access,
                ]),
                operation_type=operation,
                permission_options=dict(conditions=[PermissionCondition.HAS_NOTEBOOK_EDIT_ACCESS]),
                test_suites=[TestSuite.INVERSE],
            ))
        )

        method_name = f'test_authorize_action_{operation}_for_{entity_name}'
        method_name = f'{method_name}_with_condition_has_pipeline_edit_access_0'
        setattr(
            BasePolicyWithPermissionsTest,
            method_name,
            patch(
                'mage_ai.api.policies.mixins.user_permissions.is_disable_pipeline_edit_access',
                lambda: False,
            )(build_test_action(
                access=Permission.add_accesses([
                    PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                    operation_access,
                ]),
                operation_type=operation,
                permission_options=dict(conditions=[PermissionCondition.HAS_PIPELINE_EDIT_ACCESS]),
            ))
        )

        method_name = f'test_authorize_action_{operation}_for_{entity_name}'
        method_name = f'{method_name}_with_condition_has_pipeline_edit_access_2'
        setattr(
            BasePolicyWithPermissionsTest,
            method_name,
            patch(
                'mage_ai.api.policies.mixins.user_permissions.is_disable_pipeline_edit_access',
                lambda: True,
            )(build_test_action(
                access=Permission.add_accesses([
                    PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                    operation_access,
                ]),
                operation_type=operation,
                permission_options=dict(conditions=[PermissionCondition.HAS_PIPELINE_EDIT_ACCESS]),
                test_suites=[TestSuite.INVERSE],
            ))
        )

        method_name = f'test_authorize_action_{operation}_for_{entity_name}'
        method_name = f'{method_name}_with_access_condition_user_owns_entity_pass'
        setattr(
            BasePolicyWithPermissionsTest,
            method_name,
            build_test_action(
                access=Permission.add_accesses([
                    PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                    operation_access,
                ]),
                operation_type=operation,
                permission_options=dict(conditions=[PermissionCondition.USER_OWNS_ENTITY]),
            ),
        )

        method_name = f'test_authorize_action_{operation}_for_{entity_name}'
        method_name = f'{method_name}_with_access_condition_user_owns_entity_fail'
        setattr(
            BasePolicyWithPermissionsTest,
            method_name,
            build_test_action(
                access=Permission.add_accesses([
                    PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                    operation_access,
                ]),
                current_user=User(id=secrets.token_urlsafe()),
                operation_type=operation,
                permission_options=dict(conditions=[PermissionCondition.USER_OWNS_ENTITY]),
                test_suites=[TestSuite.INVERSE],
            ),
        )

        for attribute_operation in attribute_operations:
            access_attribute_operation = \
                ATTRIBUTE_OPERATION_TYPE_TO_ACCESS_MAPPING[attribute_operation]

            def build_test_attribute(
                access,
                access_attribute_operation,
                operation_type,
                attribute_operation_type,
                attributes: List[str],
                current_user=None,
                permission_options: Dict = None,
                test_suites: List[TestSuite] = None,
                entity_name=entity_name,
            ):
                @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
                @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
                async def _test_attribute(
                    self,
                    access=access,
                    access_attribute_operation=access_attribute_operation,
                    attribute_operation_type=attribute_operation_type,
                    attributes=attributes,
                    current_user=current_user,
                    entity_name=entity_name,
                    operation_type=operation_type,
                    permission_options=permission_options,
                    test_suites=test_suites,
                ):
                    self.bootstrap()

                    # Unauthorized because the user has no permissions.
                    if not test_suites or TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS in test_suites:
                        error = False
                        try:
                            if AttributeOperationType.QUERY == attribute_operation_type:
                                await self.build_policy(
                                    current_user=current_user,
                                    entity_name=entity_name,
                                ).authorize_query(
                                    index_by(lambda x: x, attributes),
                                    api_operation_action=operation_type,
                                )
                            else:
                                for attribute in attributes:
                                    await self.build_policy(
                                        current_user=current_user,
                                        entity_name=entity_name,
                                    ).authorize_attribute(
                                        attribute_operation_type,
                                        attribute,
                                        api_operation_action=operation_type,
                                    )
                        except ApiError:
                            error = True
                        self.assertTrue(error)

                    self.create_permission(
                        list(filter(
                            lambda x: x is not None,
                            [access, access_attribute_operation],
                        )),
                        entity_name=entity_name,
                        options=permission_options,
                    )

                    # Authorized
                    if not test_suites or TestSuite.AUTHORIZED in test_suites:
                        if AttributeOperationType.QUERY == attribute_operation_type:
                            await self.build_policy(
                                current_user=current_user,
                                entity_name=entity_name,
                            ).authorize_query(
                                index_by(lambda x: x, attributes),
                                api_operation_action=operation_type,
                            )
                        else:
                            for attribute in attributes:
                                await self.build_policy(
                                    current_user=current_user,
                                    entity_name=entity_name,
                                ).authorize_attribute(
                                    attribute_operation_type,
                                    attribute,
                                    api_operation_action=operation_type,
                                )

                    if test_suites and TestSuite.INVERSE in test_suites:
                        error = False
                        try:
                            if AttributeOperationType.QUERY == attribute_operation_type:
                                await self.build_policy(
                                    current_user=current_user,
                                    entity_name=entity_name,
                                ).authorize_query(
                                    index_by(lambda x: x, attributes),
                                    api_operation_action=operation_type,
                                )
                            else:
                                for attribute in attributes:
                                    await self.build_policy(
                                        current_user=current_user,
                                        entity_name=entity_name,
                                    ).authorize_attribute(
                                        attribute_operation_type,
                                        attribute,
                                        api_operation_action=operation_type,
                                    )
                        except ApiError:
                            error = True
                        self.assertTrue(error)

                    # Unauthorized for a different entity and different attribute
                    if not test_suites or TestSuite.UNAUTHORIZED_FOR_ANOTHER_ENTITY in test_suites:
                        error = False
                        try:
                            if AttributeOperationType.QUERY == attribute_operation_type:
                                await self.build_policy(
                                    current_user=current_user,
                                    entity_name=find(
                                        lambda x, entity_name=entity_name: x != entity_name,
                                        entity_names,
                                    ),
                                ).authorize_query(
                                    index_by(lambda x: x, attributes),
                                    api_operation_action=operation_type,
                                )
                            else:
                                for attribute in attributes:
                                    await self.build_policy(
                                        current_user=current_user,
                                        entity_name=find(
                                            lambda x, entity_name=entity_name: x != entity_name,
                                            entity_names,
                                        ),
                                    ).authorize_attribute(
                                        attribute_operation_type,
                                        attribute,
                                        api_operation_action=operation_type,
                                    )
                        except ApiError:
                            error = True
                        self.assertTrue(error)

                        error = False
                        try:
                            if AttributeOperationType.QUERY == attribute_operation_type:
                                await self.build_policy(
                                    current_user=current_user,
                                    entity_name=entity_name,
                                ).authorize_query(
                                    index_by(lambda x: f'not_{x}', attributes),
                                    api_operation_action=operation_type,
                                )
                            else:
                                for attribute in attributes:
                                    await self.build_policy(
                                        current_user=current_user,
                                        entity_name=entity_name,
                                    ).authorize_attribute(
                                        attribute_operation_type,
                                        f'not_{attribute}',
                                        api_operation_action=operation_type,
                                    )
                        except ApiError:
                            error = True
                        self.assertTrue(error)

                    # Unauthorized for a different operation.
                    if not test_suites or TestSuite.UNAUTHORIZED in test_suites:
                        error = False
                        try:
                            if AttributeOperationType.QUERY == attribute_operation_type:
                                await self.build_policy(
                                    current_user=current_user,
                                    entity_name=entity_name,
                                ).authorize_query(
                                    index_by(lambda x: x, attributes),
                                    api_operation_action=find(
                                        lambda x: x != operation_type,
                                        operations,
                                    ),
                                )
                            else:
                                for attribute in attributes:
                                    await self.build_policy(
                                        current_user=current_user,
                                        entity_name=entity_name,
                                    ).authorize_attribute(
                                        attribute_operation_type,
                                        attribute,
                                        api_operation_action=find(
                                            lambda x: x != operation_type,
                                            operations,
                                        ),
                                    )
                        except ApiError:
                            error = True
                        self.assertTrue(error)

                    # # Disable operation
                    if not test_suites or TestSuite.DISABLED in test_suites:
                        self.create_permission(
                            [
                                ATTRIBUTE_OPERATION_TYPE_DISABLE_TO_ACCESS_MAPPING[
                                    attribute_operation_type
                                ],
                            ] + list(filter(
                                lambda x: x is not None,
                                [access, access_attribute_operation],
                            )),
                            entity_name=entity_name,
                            options=permission_options,
                        )
                        error = False
                        try:
                            if AttributeOperationType.QUERY == attribute_operation_type:
                                await self.build_policy(
                                    current_user=current_user,
                                    entity_name=entity_name,
                                ).authorize_query(
                                    index_by(lambda x: x, attributes),
                                    api_operation_action=operation_type,
                                )
                            else:
                                for attribute in attributes:
                                    await self.build_policy(
                                        current_user=current_user,
                                        entity_name=entity_name,
                                    ).authorize_attribute(
                                        attribute_operation_type,
                                        attribute,
                                        api_operation_action=operation_type,
                                    )
                        except ApiError:
                            error = True
                        self.assertTrue(error)

                    self.cleanup()

                return _test_attribute

            attribute_uuid = 'id'
            attributes = [attribute_uuid]

            options = {}
            if AttributeOperationType.QUERY == attribute_operation:
                options['query_attributes'] = [attribute_uuid]
            elif AttributeOperationType.READ == attribute_operation:
                options['read_attributes'] = [attribute_uuid]
            elif AttributeOperationType.WRITE == attribute_operation:
                options['write_attributes'] = [attribute_uuid]

            method_name = f'test_authorize_{attribute_operation}_attribute_on_{operation}_for'
            method_name = f'{method_name}_{entity_name}_with_access_{operation_access}'
            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                build_test_attribute(
                    access=operation_access,
                    access_attribute_operation=access_attribute_operation,
                    attribute_operation_type=attribute_operation,
                    attributes=attributes,
                    entity_name=entity_name,
                    operation_type=operation,
                    permission_options=options,
                ),
            )

            if operation in [
                OperationType.DETAIL,
                OperationType.LIST,
            ] and attribute_operation in [
                AttributeOperationType.READ,
            ]:
                for group_access, test_suites in [
                    (
                        PermissionAccess.ADMIN,
                        [
                            TestSuite.AUTHORIZED,
                            TestSuite.DISABLED,
                            TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                        ],
                    ),
                    (
                        PermissionAccess.EDITOR,
                        [
                            TestSuite.AUTHORIZED,
                            TestSuite.DISABLED,
                            TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                        ],
                    ),
                    (
                        PermissionAccess.OWNER,
                        [
                            TestSuite.AUTHORIZED,
                            TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                        ],
                    ),
                    (
                        PermissionAccess.VIEWER,
                        [
                            TestSuite.AUTHORIZED,
                            TestSuite.DISABLED,
                            TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                        ],
                    ),
                ]:
                    method_name = f'test_authorize_{attribute_operation}_' \
                        f'attribute_on_{operation}_for'
                    method_name = f'{method_name}_{entity_name}_with_access_{group_access}'
                    setattr(
                        BasePolicyWithPermissionsTest,
                        method_name,
                        build_test_attribute(
                            access=None,
                            access_attribute_operation=group_access,
                            attribute_operation_type=attribute_operation,
                            attributes=attributes,
                            entity_name=entity_name,
                            operation_type=operation,
                            permission_options=options,
                            test_suites=test_suites,
                        ),
                    )

            if operation in [
                OperationType.CREATE,
                OperationType.DELETE,
                OperationType.UPDATE,
            ] and attribute_operation in [
                AttributeOperationType.QUERY,
                AttributeOperationType.WRITE,
            ]:
                for group_access, test_suites in [
                    (
                        PermissionAccess.ADMIN,
                        [
                            TestSuite.AUTHORIZED,
                            TestSuite.DISABLED,
                            TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                        ],
                    ),
                    (
                        PermissionAccess.EDITOR,
                        [
                            TestSuite.AUTHORIZED,
                            TestSuite.DISABLED,
                            TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                        ],
                    ),
                    (
                        PermissionAccess.OWNER,
                        [
                            TestSuite.AUTHORIZED,
                            TestSuite.UNAUTHORIZED_WITH_NO_PERMISSIONS,
                        ],
                    ),
                ]:
                    method_name = f'test_authorize_{attribute_operation}_' \
                        f'attribute_on_{operation}_for'
                    method_name = f'{method_name}_{entity_name}_with_access_{group_access}'
                    setattr(
                        BasePolicyWithPermissionsTest,
                        method_name,
                        build_test_attribute(
                            access=None,
                            access_attribute_operation=group_access,
                            attribute_operation_type=attribute_operation,
                            attributes=attributes,
                            entity_name=entity_name,
                            operation_type=operation,
                            permission_options=options,
                            test_suites=test_suites,
                        ),
                    )

            for access_all in [
                PermissionAccess.ALL,
                Permission.add_accesses([
                    PermissionAccess.OPERATION_ALL,
                    access_attribute_operation,
                ]),
            ]:
                method_name = f'test_authorize_{attribute_operation}_' \
                    f'attribute_on_{operation}_for'
                method_name = f'{method_name}_{entity_name}_with_access_{access_all}'

                setattr(
                    BasePolicyWithPermissionsTest,
                    method_name,
                    build_test_attribute(
                        access=None,
                        access_attribute_operation=access_all,
                        attribute_operation_type=attribute_operation,
                        attributes=attributes,
                        entity_name=entity_name,
                        operation_type=operation,
                        permission_options=options,
                        test_suites=[
                            TestSuite.AUTHORIZED,
                        ],
                    ),
                )

            disable_all_attribute_operation = 0
            if AttributeOperationType.QUERY == attribute_operation:
                disable_all_attribute_operation = PermissionAccess.DISABLE_QUERY_ALL
            elif AttributeOperationType.READ == attribute_operation:
                disable_all_attribute_operation = PermissionAccess.DISABLE_READ_ALL
            elif AttributeOperationType.WRITE == attribute_operation:
                disable_all_attribute_operation = PermissionAccess.DISABLE_WRITE_ALL

            method_name = f'test_authorize_{attribute_operation}_' \
                f'attribute_on_{operation}_for'
            method_name = f'{method_name}_{entity_name}_' \
                f'with_access_{disable_all_attribute_operation}'

            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                build_test_attribute(
                    access=operation_access,
                    access_attribute_operation=Permission.add_accesses([
                        access_attribute_operation,
                        disable_all_attribute_operation,
                    ]),
                    attribute_operation_type=attribute_operation,
                    attributes=attributes,
                    entity_name=entity_name,
                    operation_type=operation,
                    permission_options=options,
                    test_suites=[
                        TestSuite.INVERSE,
                    ],
                ),
            )

            for access_disable in [
                PermissionAccess.DISABLE_OPERATION_ALL,
            ]:
                @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
                @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
                async def _test_action_with_disable_access_operation_all(
                    self,
                    access_attribute_operation=access_attribute_operation,
                    access_disable=access_disable,
                    attribute_operation=attribute_operation,
                    attributes=attributes,
                    entity_name=entity_name,
                    operation=operation,
                    operation_access=operation_access,
                ):
                    self.bootstrap()

                    self.create_permission(
                        [
                            access_attribute_operation,
                            access_disable,
                            operation_access,
                        ],
                        entity_name=entity_name,
                        options=dict(
                            query_attributes=attributes,
                            read_attributes=attributes,
                            write_attributes=attributes,
                        ),
                    )

                    # Unauthorized
                    error = False
                    try:
                        if AttributeOperationType.QUERY == attribute_operation:
                            await self.build_policy(
                                entity_name=entity_name,
                            ).authorize_query(
                                index_by(lambda x: x, attributes),
                                api_operation_action=operation,
                            )
                        else:
                            for attribute in attributes:
                                await self.build_policy(
                                    entity_name=entity_name,
                                ).authorize_attribute(
                                    attribute_operation,
                                    attribute,
                                    api_operation_action=operation,
                                )
                    except ApiError:
                        error = True
                    self.assertTrue(error)

                    self.cleanup()

                method_name = f'test_authorize_{attribute_operation}_' \
                    f'attribute_on_{operation}_for'
                method_name = f'{method_name}_{entity_name}_with_disable_access_operation_all'

                setattr(
                    BasePolicyWithPermissionsTest,
                    method_name,
                    _test_action_with_disable_access_operation_all,
                )

            method_name = f'test_authorize_{attribute_operation}_' \
                f'attribute_on_{operation}_for'
            method_name = f'{method_name}_{entity_name}_' \
                'with_condition_has_notebook_edit_access_0'
            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                patch(
                    'mage_ai.api.policies.mixins.user_permissions.DISABLE_NOTEBOOK_EDIT_ACCESS',
                    0,
                )(build_test_attribute(
                    access=Permission.add_accesses([
                        PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                        operation_access,
                    ]),
                    access_attribute_operation=access_attribute_operation,
                    attribute_operation_type=attribute_operation,
                    attributes=attributes,
                    entity_name=entity_name,
                    operation_type=operation,
                    permission_options=merge_dict(
                        options,
                        dict(conditions=[PermissionCondition.HAS_NOTEBOOK_EDIT_ACCESS]),
                    ),
                )),
            )

            method_name = f'test_authorize_{attribute_operation}_' \
                f'attribute_on_{operation}_for'
            method_name = f'{method_name}_{entity_name}_' \
                'with_condition_has_notebook_edit_access_1'
            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                patch(
                    'mage_ai.api.policies.mixins.user_permissions.DISABLE_NOTEBOOK_EDIT_ACCESS',
                    1,
                )(build_test_attribute(
                    access=Permission.add_accesses([
                        PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                        operation_access,
                    ]),
                    access_attribute_operation=access_attribute_operation,
                    attribute_operation_type=attribute_operation,
                    attributes=attributes,
                    entity_name=entity_name,
                    operation_type=operation,
                    permission_options=merge_dict(
                        options,
                        dict(conditions=[PermissionCondition.HAS_NOTEBOOK_EDIT_ACCESS]),
                    ),
                    test_suites=[TestSuite.INVERSE],
                )),
            )

            method_name = f'test_authorize_{attribute_operation}_' \
                f'attribute_on_{operation}_for'
            method_name = f'{method_name}_{entity_name}_' \
                'with_access_condition_has_pipeline_edit_access_0'
            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                patch(
                    'mage_ai.api.policies.mixins.user_permissions.is_disable_pipeline_edit_access',
                    lambda: False,
                )(build_test_attribute(
                    access=Permission.add_accesses([
                        PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                        operation_access,
                    ]),
                    access_attribute_operation=access_attribute_operation,
                    attribute_operation_type=attribute_operation,
                    attributes=attributes,
                    entity_name=entity_name,
                    operation_type=operation,
                    permission_options=merge_dict(
                        options,
                        dict(conditions=[PermissionCondition.HAS_PIPELINE_EDIT_ACCESS]),
                    ),
                )),
            )

            method_name = f'test_authorize_{attribute_operation}_' \
                f'attribute_on_{operation}_for'
            method_name = f'{method_name}_{entity_name}_' \
                'with_access_condition_has_pipeline_edit_access_2'
            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                patch(
                    'mage_ai.api.policies.mixins.user_permissions.is_disable_pipeline_edit_access',
                    lambda: True,
                )(build_test_attribute(
                    access=Permission.add_accesses([
                        PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                        operation_access,
                    ]),
                    access_attribute_operation=access_attribute_operation,
                    attribute_operation_type=attribute_operation,
                    attributes=attributes,
                    entity_name=entity_name,
                    operation_type=operation,
                    permission_options=merge_dict(
                        options,
                        dict(conditions=[PermissionCondition.HAS_PIPELINE_EDIT_ACCESS]),
                    ),
                    test_suites=[TestSuite.INVERSE],
                )),
            )

            method_name = f'test_authorize_{attribute_operation}_' \
                f'attribute_on_{operation}_for'
            method_name = f'{method_name}_{entity_name}_' \
                'with_access_condition_user_owns_entity_pass'
            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                build_test_attribute(
                    access=Permission.add_accesses([
                        PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                        operation_access,
                    ]),
                    access_attribute_operation=access_attribute_operation,
                    attribute_operation_type=attribute_operation,
                    attributes=attributes,
                    entity_name=entity_name,
                    operation_type=operation,
                    permission_options=merge_dict(
                        options,
                        dict(conditions=[PermissionCondition.USER_OWNS_ENTITY]),
                    ),
                ),
            )

            method_name = f'test_authorize_{attribute_operation}_' \
                f'attribute_on_{operation}_for'
            method_name = f'{method_name}_{entity_name}_' \
                'with_access_condition_user_owns_entity_fail'
            setattr(
                BasePolicyWithPermissionsTest,
                method_name,
                build_test_attribute(
                    access=Permission.add_accesses([
                        PermissionAccess.DISABLE_UNLESS_CONDITIONS,
                        operation_access,
                    ]),
                    access_attribute_operation=access_attribute_operation,
                    attribute_operation_type=attribute_operation,
                    attributes=attributes,
                    entity_name=entity_name,
                    current_user=User(id=secrets.token_urlsafe()),
                    operation_type=operation,
                    permission_options=merge_dict(
                        options,
                        dict(conditions=[PermissionCondition.USER_OWNS_ENTITY]),
                    ),
                    test_suites=[TestSuite.INVERSE],
                ),
            )
