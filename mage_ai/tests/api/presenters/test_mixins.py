from mage_ai.api.presenters.BasePresenter import BasePresenter
from mage_ai.api.presenters.mixins.users import AssociatedUserPresenter
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.tests.api.mixins import BootstrapMixin
from mage_ai.tests.api.operations.test_base import BaseApiTestCase


class TestMixinPresenter(BasePresenter, AssociatedUserPresenter):
    default_attributes = [
        'user',
    ]


class BasePresenterTest(BaseApiTestCase, BootstrapMixin):
    async def test_user(self):
        self.bootstrap()

        model = dict(user=self.user)
        self.user.avatar = 'ZZ'
        self.user.first_name = self.faker.name()
        self.user.last_name = self.faker.name()
        self.user._owner = True

        resource = GenericResource(model, None)
        presenter = TestMixinPresenter(resource, None)

        result = await presenter.present()
        self.assertEqual(result, dict(user=dict(
            avatar=self.user.avatar,
            first_name=self.user.first_name,
            id=self.user.id,
            last_name=self.user.last_name,
            owner=self.user.owner,
            project_access=self.user.project_access,
            roles=self.user.roles,
            roles_display=self.user.roles_display,
            roles_new=self.user.roles_new,
            username=self.user.username,
        )))

        self.cleanup()
