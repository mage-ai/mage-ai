from unittest.mock import patch

from mage_ai.api.errors import ApiError
from mage_ai.api.oauth_scope import OauthScope
from mage_ai.api.policies.BasePolicy import BasePolicy
from mage_ai.api.presenters.BasePresenter import BasePresenter, CustomDict
from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.tests.api.mixins import BootstrapMixin
from mage_ai.tests.api.operations.test_base import BaseApiTestCase


class TestPresenter(BasePresenter):
    default_attributes = [
        'id',
        'username',
    ]


TestPresenter.register_format('fire', ['username'])
TestPresenter.register_format('override2_test/water', ['id'])
TestPresenter.register_format('with_user', TestPresenter.default_attributes + ['user'])


class TestPolicy(BasePolicy):
    pass


TestPolicy.allow_read(TestPresenter.default_attributes + ['user'], scopes=[
    OauthScope.CLIENT_ALL,
    OauthScope.CLIENT_PRIVATE,
    OauthScope.CLIENT_PUBLIC,
])


class TestResource(DatabaseResource):
    @classmethod
    def presenter_class(self):
        return TestPresenter

    @classmethod
    def policy_class(self):
        return TestPolicy


class TestGenericResource(GenericResource):
    @classmethod
    def presenter_class(self):
        return TestPresenter


@patch('mage_ai.api.policies.BasePolicy.REQUIRE_USER_AUTHENTICATION', 1)
class BasePresenterTest(BaseApiTestCase, BootstrapMixin):
    async def test_present_resource_database_resource(self):
        self.bootstrap()

        model = self.user
        resource = TestResource(model, None)

        result = await TestPresenter.present_resource(resource, self.user)
        self.assertEqual(result, dict(
            id=resource.id,
            username=resource.username,
        ))

        result = await TestPresenter.present_resource(resource, self.user, format='fire')
        self.assertEqual(result, dict(
            username=resource.username,
        ))

        result = await TestPresenter.present_resource([
            resource,
            resource,
        ], self.user)
        self.assertEqual(result, [
            dict(id=resource.id, username=resource.username),
            dict(id=resource.id, username=resource.username),
        ])

        self.cleanup()

    async def test_present_resource_generic_resource(self):
        self.bootstrap()

        model = dict(id=self.faker.name(), username=self.faker.name())
        resource = TestGenericResource(model, None)

        result = await TestPresenter.present_resource(resource, self.user)
        self.assertEqual(result, dict(
            id=resource.id,
            username=resource.username,
        ))

        result = await TestPresenter.present_resource(resource, self.user, format='fire')
        self.assertEqual(result, dict(
            username=resource.username,
        ))

        result = await TestPresenter.present_resource([
            resource,
            resource,
        ], self.user)
        self.assertEqual(result, [
            dict(id=resource.id, username=resource.username),
            dict(id=resource.id, username=resource.username),
        ])

        self.cleanup()

    async def test_present_resource_already_validated(self):
        self.bootstrap()

        class OverrideTestPresenter1(TestPresenter):
            async def present(self, **kwargs):
                result = CustomDict(await super().present(**kwargs))
                result.already_validated = True
                return result

        class OverrideTestGenericResource1(TestGenericResource):
            @classmethod
            def presenter_class(self):
                return OverrideTestPresenter1

        model = CustomDict(id=self.faker.name(), username=self.faker.name())
        resource = OverrideTestGenericResource1(model, None)

        result = await OverrideTestPresenter1.present_resource([resource, resource], self.user)
        self.assertEqual(result, [
            dict(
                id=resource.id,
                username=resource.username,
            ),
            dict(
                id=resource.id,
                username=resource.username,
            ),
        ])

        self.assertTrue(result.already_validated)

    async def test_present_model(self):
        self.bootstrap()

        model = self.user
        result = await TestPresenter.present_model(model, TestResource, None)
        self.assertEqual(result, dict(id=model.id, username=model.username))

        self.cleanup()

    async def test_present_models(self):
        self.bootstrap()

        result = await TestPresenter.present_models(self.users, TestResource, None)
        self.assertEqual(result, [dict(
            id=model.id,
            username=model.username,
        ) for model in self.users])

        self.cleanup()

    async def test_prepare_present(self):
        model = CustomDict(id=self.faker.name(), username=self.faker.name())
        resource = TestResource(model, None)
        presenter = TestPresenter(resource, None)
        self.assertEqual(await presenter.prepare_present(), presenter)

    async def test_present(self):
        class Override2TestResource(TestResource):
            pass

        model = dict(id=self.faker.name(), username=self.faker.name())
        resource = TestGenericResource(model, None)
        presenter = TestPresenter(resource, None)

        result = await presenter.present()
        self.assertEqual(result, dict(id=resource.id, username=resource.username))

        result = await presenter.present(format='fire')
        self.assertEqual(result, dict(username=resource.username))

        presenter = TestPresenter(resource, None, from_resource=Override2TestResource(model, None))
        result = await presenter.present(format='water')
        self.assertEqual(result, dict(id=resource.id))

    async def test_present_with_resource_as_attribute(self):
        user = User(id=self.faker.name(), username=self.faker.name())

        class OverrideTestResource3(TestResource):
            def user(self):
                return TestResource(user, None)

        model = User(id=self.faker.name(), username=self.faker.name())
        resource = OverrideTestResource3(model, None)
        presenter = TestPresenter(resource, None)

        result = await presenter.present(format='with_user')
        self.assertEqual(result, dict(
            id=resource.id,
            user=dict(
                id=user.id,
                username=user.username,
            ),
            username=resource.username,
        ))

    async def test_present_failed_policy_authorizations(self):
        user = User(id=self.faker.name(), username=self.faker.name())

        class Override4TestPolicy(BasePolicy):
            pass

        class Override4TestPresenter(TestPresenter):
            default_attributes = [
                'id',
            ]

        Override4TestPresenter.register_format(
            'with_user',
            Override4TestPresenter.default_attributes + [
                'user',
            ],
        )
        Override4TestPresenter.register_format('override4_test/with_user', ['username'])

        class Override4TestResource(TestResource):
            @classmethod
            def policy_class(self):
                return Override4TestPolicy

            @classmethod
            def presenter_class(self):
                return Override4TestPresenter

            def user(self):
                return Override4TestResource(user, None)

        model = User(id=self.faker.name(), username=self.faker.name())
        resource = Override4TestResource(model, None)
        presenter = Override4TestPresenter(resource, None)

        error = False
        try:
            await presenter.present(format='with_user')
        except ApiError:
            error = True
        self.assertTrue(error)

        Override4TestPolicy.allow_read(['username'], scopes=[
            OauthScope.CLIENT_ALL,
            OauthScope.CLIENT_PRIVATE,
            OauthScope.CLIENT_PUBLIC,
        ])
        result = await presenter.present(format='with_user')
        self.assertEqual(result, dict(
            id=resource.id,
            user=dict(
                username=user.username,
            ),
        ))
