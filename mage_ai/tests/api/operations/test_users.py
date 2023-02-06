from mage_ai.orchestration.db.models import User
from mage_ai.tests.api.operations.base import BaseApiTestCase
from mage_ai.tests.factory import create_user


class UserOperationTests(BaseApiTestCase):
    model_class = User

    def test_execute_create(self):
        response = self.base_test_execute_create(dict(
            email='fire@mage.ai',
            password='water',
            password_confirmation='water',
        ))
        self.assertEqual(User.query.get(response['user']['id']).email, 'fire@mage.ai')

    def test_execute_create_unauthorized(self):
        self.assertRaises(
            Exception,
            lambda: self.base_test_execute_create(dict(
                email='fire@mage.ai',
                password='water',
                password_confirmation='water',
            ), user=create_user(), after_create_count=1, before_create_count=1)
        )

    def test_execute_delete(self):
        user = create_user(owner=True)
        self.assertRaises(
            Exception,
            self.base_test_execute_delete(user.id),
        )

    def test_execute_detail(self):
        user = create_user()
        self.base_test_execute_detail(user.id, dict(
            email=user.email,
            username=user.username,
        ))

    def test_execute_detail_unauthorized(self):
        user = create_user()
        self.assertRaises(
            Exception,
            lambda: self.base_test_execute_detail(user.id, dict(
                email=user.email,
                username=user.username,
            ), user=create_user()),
        )

    def test_execute_list(self):
        owner = create_user(owner=True)
        self.base_test_execute_list(
            [
                dict(email='mage1@mage.ai', password='mage', password_confirmation='mage'),
                dict(email='mage2@mage.ai', password='mage', password_confirmation='mage'),
            ],
            [
                'id',
            ],
            user=owner,
        )

    def test_execute_list_unauthorized(self):
        self.assertRaises(
            Exception,
            lambda: self.base_test_execute_list([], user=create_user()),
        )

    def test_execute_update(self):
        user = create_user()
        new_username = self.faker.name()
        self.base_test_execute_update(
            user.id,
            dict(username=new_username),
            dict(username=new_username),
            user=user,
        )

    def test_execute_update_unauthorized(self):
        user = create_user()
        self.assertRaises(
            Exception,
            lambda: self.base_test_execute_update(user.id, {}, {}, user=create_user()),
        )
