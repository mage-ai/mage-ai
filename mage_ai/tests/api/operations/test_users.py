from mage_ai.orchestration.db.models.oauth import User
from mage_ai.tests.api.operations.base import BaseApiTestCase
from mage_ai.tests.factory import create_user


class UserOperationTests(BaseApiTestCase):
    model_class = User

    async def test_execute_create(self):
        email = self.faker.email()
        response = await self.base_test_execute_create(dict(
            email=email,
            password='water_lightning',
            password_confirmation='water_lightning',
        ))
        self.assertEqual(User.query.get(response['user']['id']).email, email)

    async def test_execute_create_unauthorized(self):
        async def _func():
            await self.base_test_execute_create(dict(
                email=self.faker.email(),
                password='water_lightning',
                password_confirmation='water_lightning',
            ), user=create_user(), after_create_count=3, before_create_count=2)

        await self.assertRaisesAsync(Exception, _func)

    async def test_execute_delete(self):
        user = create_user(email=self.faker.email())

        await self.base_test_execute_delete(user.id)

    async def test_execute_delete_unauthorized(self):
        user = create_user(email=self.faker.email())

        async def _func():
            await self.base_test_execute_delete(user.id, user=user)

        await self.assertRaisesAsync(Exception, _func)

    async def test_execute_detail(self):
        user = create_user()
        await self.base_test_execute_detail(user.id, dict(
            email=user.email,
            username=user.username,
        ))

    async def test_execute_detail_unauthorized(self):
        user = create_user()

        async def _func():
            await self.base_test_execute_detail(user.id, dict(
                email=user.email,
                username=user.username,
            ), user=create_user())

        await self.assertRaisesAsync(Exception, _func)

    async def test_execute_list(self):
        owner = create_user(owner=True)

        email1 = self.faker.email()
        email2 = self.faker.email()

        await self.base_test_execute_list(
            [
                dict(
                    email=email1,
                    password='water_lightning',
                    password_confirmation='water_lightning',
                ),
                dict(
                    email=email2,
                    password='water_lightning',
                    password_confirmation='water_lightning',
                ),
            ],
            [
                'id',
            ],
            user=owner,
        )

    async def test_execute_list_unauthorized(self):
        async def _func():
            await self.base_test_execute_list([], user=create_user())

        await self.assertRaisesAsync(Exception, _func)

    async def test_execute_update(self):
        user = create_user()
        new_username = self.faker.name()

        await self.base_test_execute_update(
            user.id,
            dict(username=new_username),
            dict(username=new_username),
            user=user,
        )

    async def test_execute_update_unauthorized(self):
        user = create_user()

        async def _func():
            await self.base_test_execute_update(user.id, {}, {}, user=create_user())

        await self.assertRaisesAsync(Exception, _func)
