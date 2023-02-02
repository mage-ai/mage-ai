from mage_ai.api.operations import constants
from mage_ai.orchestration.db.models import User
from mage_ai.tests.api.operations.base import BaseApiTestCase
from typing import Dict, Union
from mage_ai.authentication.passwords import create_bcrypt_hash, generate_salt


class UserOperationTests(BaseApiTestCase):
    model_class = User

    def build_model(self, as_dict: bool = False, save: bool = True, **kwargs) -> Union[Dict, User]:
        password = self.faker.password()
        password_salt = generate_salt()
        password_hash = create_bcrypt_hash(password, password_salt)
        payload = dict(
            email=self.faker.email(),
            username=self.faker.name(),
            **kwargs,
        )

        if as_dict:
            payload.update(password=password)
            return payload

        user = User(
            password_hash=password_hash,
            password_salt=password_salt,
            **payload,
        )
        if save:
            user.save()

        return user

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
            ), user=self.build_model(), after_create_count=1, before_create_count=1)
        )

    def test_execute_delete(self):
        user = self.build_model(owner=True)
        self.assertRaises(
            Exception,
            self.base_test_execute_delete(user.id),
        )

    def test_execute_detail(self):
        user = self.build_model()
        self.base_test_execute_detail(user.id, dict(
            email=user.email,
            username=user.username,
        ))

    def test_execute_detail_unauthorized(self):
        user = self.build_model()
        self.assertRaises(
            Exception,
            lambda: self.base_test_execute_detail(user.id, dict(
                email=user.email,
                username=user.username,
            ), user=self.build_model()),
        )

    def test_execute_list(self):
        owner = self.build_model(owner=True)
        response = self.base_test_execute_list([
            dict(email='mage1@mage.ai', password='mage', password_confirmation='mage'),
            dict(email='mage2@mage.ai', password='mage', password_confirmation='mage'),
            ], [
                'id',
            ],
            user=owner,
        )

    def test_execute_list_unauthorized(self):
        self.assertRaises(
            Exception,
            lambda: self.base_test_execute_list([], user=self.build_model()),
        )

    def test_execute_update(self):
        user = self.build_model()
        new_username = self.faker.name()
        response = self.base_test_execute_update(
            user.id,
            dict(username=new_username),
            dict(username=new_username),
            user=user,
        )

    def test_execute_update_unauthorized(self):
        user = self.build_model()
        self.assertRaises(
            Exception,
            lambda: self.base_test_execute_update(user.id, {}, {}, user=self.build_model()),
        )
