from mage_ai.orchestration.db.models.oauth import User, UserRole
from mage_ai.tests.base_test import AsyncDBTestCase


class BootstrapMixin(AsyncDBTestCase):
    def setUp(self):
        super().setUp()
        self.options = dict(lightning=4, rock=5)

        user1 = User.create(username=self.faker.unique.name())
        user2 = User.create(username=self.faker.unique.name())
        user3 = User.create(username=self.faker.unique.name())
        self.users = [
            user1,
            user2,
            user3,
        ]
        self.user = self.users[0]

    def tearDown(self):
        super().tearDown()
        User.query.delete()
        UserRole.query.delete()

    def bootstrap(self):
        pass

    def cleanup(self):
        pass
