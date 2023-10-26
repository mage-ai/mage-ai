import secrets
from unittest.mock import patch

from mage_ai.api.constants import AttributeOperationType
from mage_ai.api.errors import ApiError
from mage_ai.api.oauth_scope import OauthScopeType
from mage_ai.api.operations.constants import OperationType
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.api.resources.UserResource import UserResource
from mage_ai.data_preparation.repo_manager import get_project_uuid
from mage_ai.orchestration.constants import Entity
from mage_ai.tests.api.mixins import BootstrapMixin
from mage_ai.tests.api.operations.test_base import BaseApiTestCase


class CustomTestPolicy(BasePolicy):
    def fail_condition(self) -> bool:
        return False

    def test_condition(self) -> bool:
        return True


class CustomTestResource(GenericResource):
    @classmethod
    def policy_class(self):
        return CustomTestPolicy


CustomTestPolicy.allow_actions(
    [
        OperationType.LIST,
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.test_condition(),
    override_permission_condition=lambda policy: policy.test_condition(),
)


CustomTestPolicy.allow_actions(
    [
        OperationType.LIST,
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
    condition=lambda policy: policy.fail_condition(),
    override_permission_condition=lambda policy: policy.fail_condition(),
)


CustomTestPolicy.allow_read(
    [
        'first_name',
        'username',
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.LIST,
    ],
    condition=lambda policy: policy.test_condition(),
    override_permission_condition=lambda policy: policy.test_condition(),
)


CustomTestPolicy.allow_read(
    [
        'first_name',
        'username',
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.LIST,
    ],
    condition=lambda policy: policy.fail_condition(),
    override_permission_condition=lambda policy: policy.fail_condition(),
)


CustomTestPolicy.allow_write(
    [
        'first_name',
        'username',
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.LIST,
    ],
    condition=lambda policy: policy.test_condition(),
    override_permission_condition=lambda policy: policy.test_condition(),
)


CustomTestPolicy.allow_write(
    [
        'first_name',
        'username',
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.LIST,
    ],
    condition=lambda policy: policy.fail_condition(),
    override_permission_condition=lambda policy: policy.fail_condition(),
)


CustomTestPolicy.allow_query(
    [
        'username',
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.LIST,
    ],
    condition=lambda policy: policy.test_condition(),
    override_permission_condition=lambda policy: policy.test_condition(),
)


CustomTestPolicy.allow_query(
    [
        'username',
    ],
    scopes=[
        OauthScopeType.CLIENT_PRIVATE,
    ],
    on_action=[
        OperationType.LIST,
    ],
    condition=lambda policy: policy.fail_condition(),
    override_permission_condition=lambda policy: policy.fail_condition(),
)


@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
class BasePolicyTest(BaseApiTestCase, BootstrapMixin):
    def test_entity(self):
        self.assertEqual(CustomTestPolicy(None, None).entity, (Entity.PROJECT, get_project_uuid()))

    def test_resource_name(self):
        self.assertEqual(CustomTestPolicy.resource_name(), 'custom_tests')

    def test_model_name(self):
        self.assertEqual(CustomTestPolicy.model_name(), 'CustomTest')

    def test_resource_name_singular(self):
        self.assertEqual(CustomTestPolicy.resource_name_singular(), 'custom_test')

    def test_is_owner(self):
        policy = CustomTestPolicy(None, secrets.token_urlsafe())

        with patch('mage_ai.api.policies.BasePolicy.is_owner') as mock:
            mock.return_value = True
            self.assertTrue(policy.is_owner())
            mock.return_value = False
            self.assertTrue(policy.is_owner())

            mock.assert_called_once_with(
                policy.current_user,
                entity=policy.entity[0],
                entity_id=policy.entity[1],
            )

    def test_has_at_least_admin_role(self):
        policy = CustomTestPolicy(None, secrets.token_urlsafe())

        with patch('mage_ai.api.policies.BasePolicy.has_at_least_admin_role') as mock:
            mock.return_value = True
            self.assertTrue(policy.has_at_least_admin_role())
            mock.return_value = False
            self.assertTrue(policy.has_at_least_admin_role())

            mock.assert_called_once_with(
                policy.current_user,
                entity=policy.entity[0],
                entity_id=policy.entity[1],
            )

    def test_has_at_least_editor_role(self):
        policy = CustomTestPolicy(None, secrets.token_urlsafe())

        with patch('mage_ai.api.policies.BasePolicy.has_at_least_editor_role') as mock:
            mock.return_value = True
            self.assertTrue(policy.has_at_least_editor_role())
            mock.return_value = False
            self.assertTrue(policy.has_at_least_editor_role())

            mock.assert_called_once_with(
                policy.current_user,
                entity=policy.entity[0],
                entity_id=policy.entity[1],
            )

    def test_has_at_least_editor_role_and_notebook_edit_access(self):
        policy = CustomTestPolicy(None, secrets.token_urlsafe())

        with patch(
            'mage_ai.api.policies.BasePolicy.has_at_least_editor_role_and_notebook_edit_access',
        ) as mock:
            mock.return_value = True
            self.assertTrue(policy.has_at_least_editor_role_and_notebook_edit_access(
                disable_notebook_edit_access_override=True,
            ))
            mock.return_value = False
            self.assertTrue(policy.has_at_least_editor_role_and_notebook_edit_access(
                disable_notebook_edit_access_override=True,
            ))

            mock.assert_called_once_with(
                policy.current_user,
                entity=policy.entity[0],
                entity_id=policy.entity[1],
                disable_notebook_edit_access_override=True,
            )

    def test_has_at_least_editor_role_and_pipeline_edit_access(self):
        policy = CustomTestPolicy(None, secrets.token_urlsafe())

        with patch(
            'mage_ai.api.policies.BasePolicy.has_at_least_editor_role_and_pipeline_edit_access',
        ) as mock:
            mock.return_value = True
            self.assertTrue(policy.has_at_least_editor_role_and_pipeline_edit_access(
                disable_notebook_edit_access_override=True,
            ))
            mock.return_value = False
            self.assertTrue(policy.has_at_least_editor_role_and_pipeline_edit_access(
                disable_notebook_edit_access_override=True,
            ))

            mock.assert_called_once_with(
                policy.current_user,
                entity=policy.entity[0],
                entity_id=policy.entity[1],
                disable_notebook_edit_access_override=True,
            )

    def test_has_at_least_viewer_role(self):
        policy = CustomTestPolicy(None, secrets.token_urlsafe())

        with patch('mage_ai.api.policies.BasePolicy.has_at_least_viewer_role') as mock:
            mock.return_value = True
            self.assertTrue(policy.has_at_least_viewer_role())
            mock.return_value = False
            self.assertTrue(policy.has_at_least_viewer_role())

            mock.assert_called_once_with(
                policy.current_user,
                entity=policy.entity[0],
                entity_id=policy.entity[1],
            )

    async def test_authorize_action_is_owner(self):
        def _rule(action):
            return {
                OperationType.DETAIL: {
                    OauthScopeType.CLIENT_PRIVATE: [
                        dict(
                            condition=lambda _policy: _policy.is_owner(),
                        ),
                    ],
                },
            }[action]
        with patch.object(CustomTestPolicy, 'action_rule', _rule):
            resource = CustomTestResource(None, None)
            policy = CustomTestPolicy(resource, secrets.token_urlsafe())
            with patch.object(policy, 'is_owner', lambda: True):
                await policy.authorize_action(OperationType.DETAIL)

    async def test_authorize_action(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)
        await policy.authorize_action(OperationType.LIST)

        self.cleanup()

    async def test_authorize_failure_condition(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)
        with patch.object(policy, 'test_condition', lambda: False):
            error = False
            try:
                await policy.authorize_action(OperationType.LIST)
            except ApiError:
                error = True
            self.assertTrue(error)

        self.cleanup()

    async def test_authorize_failure_unauthorized_action(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        error = False
        try:
            await policy.authorize_action(OperationType.DETAIL)
        except ApiError:
            error = True
        self.assertTrue(error)

        self.cleanup()

    async def test_authorize_attribute_read(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)
        await policy.authorize_attribute(
            AttributeOperationType.READ,
            'username',
            api_operation_action=OperationType.LIST,
        )

        self.cleanup()

    async def test_authorize_attribute_read_is_owner(self):
        policy = CustomTestPolicy(None, secrets.token_urlsafe())
        with patch.object(policy, 'is_owner', lambda: True):
            self.assertTrue(await policy.authorize_attribute(
                AttributeOperationType.READ,
                'id',
                api_operation_action=OperationType.DETAIL,
            ))

    async def test_authorize_attribute_read_failure_condition(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        with patch.object(policy, 'test_condition', lambda: False):
            error = False
            try:
                await policy.authorize_attribute(
                    AttributeOperationType.READ,
                    'username',
                    api_operation_action=OperationType.LIST,
                )
            except ApiError:
                error = True
            self.assertTrue(error)

        self.cleanup()

    async def test_authorize_attribute_read_failure_unauthorized_action(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        error = False
        try:
            await policy.authorize_attribute(
                AttributeOperationType.READ,
                'username',
                api_operation_action=OperationType.DETAIL,
            )
        except ApiError:
            error = True
        self.assertTrue(error)

        self.cleanup()

    async def test_authorize_attribute_read_failure_unauthorized_attribute(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        error = False
        try:
            await policy.authorize_attribute(
                AttributeOperationType.READ,
                'id',
                api_operation_action=OperationType.LIST,
            )
        except ApiError:
            error = True
        self.assertTrue(error)

        self.cleanup()

    async def test_authorize_attribute_write(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)
        await policy.authorize_attribute(
            AttributeOperationType.WRITE,
            'username',
            api_operation_action=OperationType.LIST,
        )

        self.cleanup()

    async def test_authorize_attribute_write_is_owner(self):
        policy = CustomTestPolicy(None, secrets.token_urlsafe())
        with patch.object(policy, 'is_owner', lambda: True):
            self.assertTrue(await policy.authorize_attribute(
                AttributeOperationType.WRITE,
                'id',
                api_operation_action=OperationType.DETAIL,
            ))

    async def test_authorize_attribute_write_failure_condition(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        with patch.object(policy, 'test_condition', lambda: False):
            error = False
            try:
                await policy.authorize_attribute(
                    AttributeOperationType.WRITE,
                    'username',
                    api_operation_action=OperationType.LIST,
                )
            except ApiError:
                error = True
            self.assertTrue(error)

        self.cleanup()

    async def test_authorize_attribute_write_failure_unauthorized_action(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        error = False
        try:
            await policy.authorize_attribute(
                AttributeOperationType.WRITE,
                'username',
                api_operation_action=OperationType.DETAIL,
            )
        except ApiError:
            error = True
        self.assertTrue(error)

        self.cleanup()

    async def test_authorize_attribute_write_failure_unauthorized_attribute(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        error = False
        try:
            await policy.authorize_attribute(
                AttributeOperationType.WRITE,
                'id',
                api_operation_action=OperationType.LIST,
            )
        except ApiError:
            error = True
        self.assertTrue(error)

        self.cleanup()

    async def test_authorize_query(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)
        await policy.authorize_query(
            dict(username=1),
            api_operation_action=OperationType.LIST,
        )

        self.cleanup()

    async def test_authorize_query_is_owner(self):
        policy = CustomTestPolicy(None, secrets.token_urlsafe())
        with patch.object(policy, 'is_owner', lambda: True):
            self.assertTrue(await policy.authorize_query(
                dict(id=1),
                api_operation_action=OperationType.DETAIL,
            ))

    async def test_authorize_query_failure_condition(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        with patch.object(policy, 'test_condition', lambda: False):
            error = False
            try:
                await policy.authorize_query(
                    dict(username=1),
                    api_operation_action=OperationType.LIST,
                )
            except ApiError:
                error = True
            self.assertTrue(error)

        self.cleanup()

    async def test_authorize_query_failure_unauthorized_action(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        error = False
        try:
            await policy.authorize_query(
                dict(username=1),
                api_operation_action=OperationType.DETAIL,
            )
        except ApiError:
            error = True
        self.assertTrue(error)

        self.cleanup()

    async def test_authorize_query_failure_unauthorized_attribute(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        error = False
        try:
            await policy.authorize_query(
                dict(id=1),
                api_operation_action=OperationType.LIST,
            )
        except ApiError:
            error = True
        self.assertTrue(error)

        self.cleanup()

    async def test_authorize_attributes_read(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)
        await policy.authorize_attributes(
            AttributeOperationType.READ,
            [
                'first_name',
                'username',
            ],
            api_operation_action=OperationType.LIST,
        )

        self.cleanup()

    async def test_authorize_attributes_read_failure(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        error = False
        try:
            await policy.authorize_attributes(
                AttributeOperationType.READ,
                [
                    'first_name',
                    'id',
                    'username',
                ],
                api_operation_action=OperationType.LIST,
            )
        except ApiError:
            error = True
        self.assertTrue(error)

        self.cleanup()

    async def test_authorize_attributes_write(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)
        await policy.authorize_attributes(
            AttributeOperationType.WRITE,
            [
                'first_name',
                'username',
            ],
            api_operation_action=OperationType.LIST,
        )

        self.cleanup()

    async def test_authorize_attributes_write_failure(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user)

        error = False
        try:
            await policy.authorize_attributes(
                AttributeOperationType.WRITE,
                [
                    'first_name',
                    'id',
                    'username',
                ],
                api_operation_action=OperationType.LIST,
            )
        except ApiError:
            error = True
        self.assertTrue(error)

        self.cleanup()

    def test_parent_model(self):
        self.bootstrap()

        resource = CustomTestResource(self.user, self.user)
        policy = CustomTestPolicy(resource, self.user, parent_model=self.user)

        self.assertEqual(self.user, policy.parent_model())

        self.cleanup()

    def test_parent_model_manual_assignment(self):
        model = dict(power=1)
        resource = CustomTestResource(model, None)
        policy = CustomTestPolicy(resource, None)
        policy.parent_model_attr = model

        self.assertEqual(model, policy.parent_model())

    def test_parent_resource(self):
        self.bootstrap()

        policy = CustomTestPolicy(None, None, parent_model=self.user)
        parent_resource = policy.parent_resource()
        self.assertEqual(parent_resource.model, self.user)
        self.assertTrue(isinstance(parent_resource, UserResource))

        self.cleanup()

    def test_parent_resource_from_attribute(self):
        model = dict(power=1)
        resource = CustomTestResource(model, None)
        policy = CustomTestPolicy(resource, None)
        policy.parent_resource_attr = 3
        self.assertEqual(policy.parent_resource(), 3)

    def test_current_scope_with_current_user(self):
        self.bootstrap()

        policy = CustomTestPolicy(None, self.user)
        self.assertEqual(policy.current_scope(), OauthScopeType.CLIENT_PRIVATE)

        self.cleanup()

    @patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 1)
    def test_current_scope_with_disable_notebook_edit_access_and_require_user_authentication(
        self,
    ):
        policy = CustomTestPolicy(None, None)
        self.assertEqual(policy.current_scope(), OauthScopeType.CLIENT_PUBLIC)

    def test_result_set(self):
        model = dict(power=1)
        resource = CustomTestResource(model, None)
        policy = CustomTestPolicy(resource, None)
        self.assertEqual(policy.result_set(), resource.result_set())

    def test_result_set_from_attribute(self):
        policy = CustomTestPolicy(None, None)
        policy.result_set_attr = 1
        self.assertEqual(policy.result_set(), 1)

    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
    async def test_authorize_action_with_permissions_and_override_permissions(self):
        self.bootstrap()

        def _rule(action):
            return {
                OperationType.LIST: {
                    OauthScopeType.CLIENT_PRIVATE: [
                        dict(
                            condition=lambda _policy: False,
                        ),
                    ],
                },
            }[action]

        with patch.object(CustomTestPolicy, 'action_rule_with_permissions', _rule):
            resource = CustomTestResource(self.user, self.user)
            policy = CustomTestPolicy(resource, self.user)
            await policy.authorize_action(OperationType.LIST)

        self.cleanup()

    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
    async def test_authorize_attribute_read_with_permissions_and_override_permissions(self):
        self.bootstrap()

        def _rule(_attribute_operation_type, _resource_attribute):
            return {
                OauthScopeType.CLIENT_PRIVATE: {
                    OperationType.LIST: [
                        dict(
                            condition=lambda _policy: False,
                        ),
                    ],
                },
            }

        with patch.object(CustomTestPolicy, 'attribute_rule_with_permissions', _rule):
            resource = CustomTestResource(self.user, self.user)
            policy = CustomTestPolicy(resource, self.user)
            await policy.authorize_attribute(
                AttributeOperationType.READ,
                'username',
                api_operation_action=OperationType.LIST,
            )

        self.cleanup()

    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
    async def test_authorize_attribute_write_with_permissions_and_override_permissions(self):
        self.bootstrap()

        def _rule(_attribute_operation_type, _resource_attribute):
            return {
                OauthScopeType.CLIENT_PRIVATE: {
                    OperationType.LIST: [
                        dict(
                            condition=lambda _policy: False,
                        ),
                    ],
                },
            }

        with patch.object(CustomTestPolicy, 'attribute_rule_with_permissions', _rule):
            resource = CustomTestResource(self.user, self.user)
            policy = CustomTestPolicy(resource, self.user)
            await policy.authorize_attribute(
                AttributeOperationType.WRITE,
                'username',
                api_operation_action=OperationType.LIST,
            )

        self.cleanup()

    @patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_PERMISSIONS', 1)
    async def test_authorize_attribute_query_with_permissions_and_override_permissions(self):
        self.bootstrap()

        def _rule(_attribute_operation_type, _resource_attribute):
            return {
                OauthScopeType.CLIENT_PRIVATE: {
                    OperationType.LIST: [
                        dict(
                            condition=lambda _policy: False,
                        ),
                    ],
                },
            }

        with patch.object(CustomTestPolicy, 'attribute_rule_with_permissions', _rule):
            resource = CustomTestResource(self.user, self.user)
            policy = CustomTestPolicy(resource, self.user)
            await policy.authorize_attribute(
                AttributeOperationType.QUERY,
                'username',
                api_operation_action=OperationType.LIST,
            )

        self.cleanup()


@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 0)
class BasePolicyWithoutUserAuthenticationTest(BaseApiTestCase, BootstrapMixin):
    @patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 1)
    def test_current_scope_with_disable_notebook_edit_access_and_not_require_user_authentication(
        self,
    ):
        policy = CustomTestPolicy(None, None)
        self.assertEqual(policy.current_scope(), OauthScopeType.CLIENT_PRIVATE)

    @patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 0)
    def test_current_scope_without_disable_notebook_edit_access_and_not_require_user_authentication(
        self,
    ):
        policy = CustomTestPolicy(None, None)
        self.assertEqual(policy.current_scope(), OauthScopeType.CLIENT_PUBLIC)

    @patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 0)
    @patch('mage_ai.api.utils.DISABLE_NOTEBOOK_EDIT_ACCESS', 0)
    async def test_authorize_action_without_disable_notebook_edit_access(self):
        self.bootstrap()

        def _rule(action):
            return {
                OperationType.CREATE: {
                    OauthScopeType.CLIENT_PRIVATE: [
                        dict(
                            condition=lambda _policy: (
                                _policy.has_at_least_editor_role_and_pipeline_edit_access()
                            ),
                        ),
                    ],
                },
            }[action]

        with patch.object(CustomTestPolicy, 'action_rule', _rule):
            resource = CustomTestResource(None, None)
            policy = CustomTestPolicy(resource, None)
            await policy.authorize_action(OperationType.CREATE)

        self.cleanup()

    @patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 1)
    @patch('mage_ai.api.utils.DISABLE_NOTEBOOK_EDIT_ACCESS', 1)
    async def test_authorize_action_with_disable_notebook_edit_access(self):
        self.bootstrap()

        def _rule(action):
            return {
                OperationType.CREATE: {
                    OauthScopeType.CLIENT_PRIVATE: [
                        dict(
                            condition=lambda _policy: (
                                _policy.has_at_least_editor_role_and_notebook_edit_access()
                            ),
                        ),
                    ],
                },
            }[action]

        with patch.object(CustomTestPolicy, 'action_rule', _rule):
            resource = CustomTestResource(None, None)
            policy = CustomTestPolicy(resource, None)
            with self.assertRaises(ApiError) as context:
                await policy.authorize_action(OperationType.CREATE)
                self.assertTrue(context.exception.code == 403)

        self.cleanup()

    @patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 2)
    @patch('mage_ai.api.utils.is_disable_pipeline_edit_access')
    async def test_authorize_action_with_disable_pipeline_edit_access(self, mock_access_method):
        self.bootstrap()
        mock_access_method.return_value = True

        def _rule(action):
            return {
                OperationType.CREATE: {
                    OauthScopeType.CLIENT_PRIVATE: [
                        dict(
                            condition=lambda _policy: (
                                _policy.has_at_least_editor_role_and_pipeline_edit_access()
                            ),
                        ),
                    ],
                },
            }[action]

        with patch.object(CustomTestPolicy, 'action_rule', _rule):
            resource = CustomTestResource(None, None)
            policy = CustomTestPolicy(resource, None)
            with self.assertRaises(ApiError) as context:
                await policy.authorize_action(OperationType.CREATE)
                self.assertTrue(context.exception.code == 403)

        self.cleanup()

    @patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 2)
    @patch('mage_ai.api.utils.DISABLE_NOTEBOOK_EDIT_ACCESS', 2)
    @patch('mage_ai.api.utils.is_disable_pipeline_edit_access')
    async def test_authorize_action_notebook_pipeline_edit_access(self, mock_access_method):
        self.bootstrap()
        mock_access_method.return_value = True

        def _rule(action):
            return {
                OperationType.CREATE: {
                    OauthScopeType.CLIENT_PRIVATE: [
                        dict(
                            condition=lambda _policy: (
                                _policy.has_at_least_editor_role_and_notebook_edit_access()
                            ),
                        ),
                    ],
                },
                OperationType.UPDATE: {
                    OauthScopeType.CLIENT_PRIVATE: [
                        dict(
                            condition=lambda _policy: (
                                _policy.has_at_least_editor_role_and_pipeline_edit_access()
                            ),
                        ),
                    ],
                },
            }[action]

        with patch.object(CustomTestPolicy, 'action_rule', _rule):
            resource = CustomTestResource(None, None)
            policy = CustomTestPolicy(resource, None)
            await policy.authorize_action(OperationType.CREATE)

            with self.assertRaises(ApiError) as context:
                await policy.authorize_action(OperationType.UPDATE)
                self.assertTrue(context.exception.code == 403)

        self.cleanup()

    async def test_authorize_query_require_user_authentication_off(self):
        self.bootstrap()

        def _rule(action):
            return {
                'query1': {
                    OauthScopeType.CLIENT_PRIVATE: {
                        OperationType.UPDATE: [
                            dict(
                                condition=lambda _policy: False,
                            ),
                        ],
                    },
                },
            }[action]

        with patch.object(CustomTestPolicy, 'query_rule', _rule):
            resource = CustomTestResource(None, None)
            policy = CustomTestPolicy(resource, None)
            await policy.authorize_query(
                dict(query1='1'),
                api_operation_action=OperationType.UPDATE,
            )

        self.cleanup()

    @patch('mage_ai.api.policies.BasePolicy.DISABLE_NOTEBOOK_EDIT_ACCESS', 2)
    @patch('mage_ai.api.utils.DISABLE_NOTEBOOK_EDIT_ACCESS', 2)
    @patch('mage_ai.api.utils.is_disable_pipeline_edit_access')
    async def test_authorize_query_notebook_pipeline_edit_access(self, mock_access_method):
        self.bootstrap()
        mock_access_method.return_value = True

        def _rule(action):
            return {
                'query1': {
                    OauthScopeType.CLIENT_PRIVATE: {
                        OperationType.UPDATE: [
                            dict(
                                condition=lambda _policy: (
                                    _policy.has_at_least_editor_role_and_notebook_edit_access()
                                ),
                            ),
                        ],
                    },
                },
                'query2': {
                    OauthScopeType.CLIENT_PRIVATE: {
                        OperationType.UPDATE: [
                            dict(
                                condition=lambda _policy: (
                                    _policy.has_at_least_editor_role_and_pipeline_edit_access()
                                ),
                            ),
                        ],
                    },
                },
            }[action]

        with patch.object(CustomTestPolicy, 'query_rule', _rule):
            resource = CustomTestResource(None, None)
            policy = CustomTestPolicy(resource, None)
            await policy.authorize_query(
                dict(query1='1'),
                api_operation_action=OperationType.UPDATE,
            )

            with self.assertRaises(ApiError) as context:
                await policy.authorize_query(
                    dict(query2='1'),
                    api_operation_action=OperationType.UPDATE,
                )
                self.assertTrue(context.exception.code == 403)

        self.cleanup()
