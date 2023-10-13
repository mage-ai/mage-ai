from mage_ai.orchestration.db.models.oauth import User, UserRole


class BootstrapMixin:
    def bootstrap(self):
        self.options = dict(lightning=4, rock=5)

        user1 = User.create(username=self.faker.name())
        user2 = User.create(username=self.faker.name())
        user3 = User.create(username=self.faker.name())
        self.users = [
            user1,
            user2,
            user3,
        ]
        self.user = self.users[0]

    def cleanup(self):
        User.query.delete()
        UserRole.query.delete()
