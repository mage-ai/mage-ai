from unittest.mock import patch

from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db.errors import DoesNotExistError
from mage_ai.orchestration.db.models.oauth import User, UserRole
from mage_ai.tests.api.operations.test_base import BaseApiTestCase


class GenericObject:
    def on_callback(resource):
        return resource

    def on_failure_callback(resource):
        return


class UserResource(DatabaseResource):
    model_class = User

    def update(self, payload, **kwargs):
        self.on_update_callback = GenericObject.on_callback
        self.on_update_failure_callback = GenericObject.on_failure_callback
        super().update(payload, **kwargs)


class TestUserRoleResource(DatabaseResource):
    model_class = UserRole


TestUserRoleResource.register_parent_resource(UserResource)


class DatabaseResourceTest(BaseApiTestCase):
    def setUp(self):
        super().setUp()
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

    def tearDown(self):
        User.query.delete()
        UserRole.query.delete()
        super().tearDown()

    async def test_process_collection(self):
        result_set = await UserResource.process_collection(
            {},
            {},
            self.user,
            **self.options,
        )

        self.assertEqual([r.model for r in result_set], self.users)
        self.assertEqual(result_set.metadata, dict(
            count=len(self.users),
            next=False,
        ))

        result_set = await UserResource.process_collection(
            dict(username=self.user.username),
            {},
            self.user,
            **self.options,
        )

        self.assertEqual([r.model for r in result_set], [self.user])
        self.assertEqual(result_set.metadata, dict(
            count=1,
            next=False,
        ))

        result_set = await UserResource.process_collection(
            {},
            dict(_limit=2),
            self.user,
            **self.options,
        )

        self.assertEqual([r.model for r in result_set], self.users[:2])
        self.assertEqual(result_set.metadata, dict(
            count=3,
            next=True,
        ))

        result_set = await UserResource.process_collection(
            {},
            dict(_limit=2, _offset=1),
            self.user,
            **self.options,
        )

        self.assertEqual([r.model for r in result_set], self.users[1:])
        self.assertEqual(result_set.metadata, dict(
            count=3,
            next=False,
        ))

    async def test_collection(self):
        models = UserResource.collection(
            dict(username=self.user.username),
            {},
            self.user,
            **self.options,
        )

        self.assertEqual(len(list(models)), 1)
        self.assertEqual(self.user, models[0])

    async def test_collection_with_parent_model(self):
        user_roles = [UserRole.create(
            role_id=2 if idx == 2 else 0,
            user_id=user.id,
        ) for idx, user in enumerate(self.users)]

        models = TestUserRoleResource.collection(
            dict(role_id=0),
            {},
            self.user,
            parent_model=self.user,
            **self.options,
        )

        self.assertEqual(len(list(models)), 1)
        self.assertEqual(user_roles[0], models[0])
        self.assertEqual(self.user.id, models[0].id)

    def test_create(self):
        self.assertEqual(len(User.query.all()), len(self.users))

        username = self.faker.name()
        resource = UserResource.create(dict(username=username), None)

        self.assertEqual(resource.model.username, username)
        self.assertEqual(len(User.query.all()), len(self.users) + 1)

    def test_create_with_parent_model(self):
        self.assertEqual(len(UserRole.query.all()), 0)

        resource = TestUserRoleResource.create(dict(role_id=0), None, parent_model=self.user)

        self.assertEqual(resource.role_id, 0)
        self.assertEqual(resource.user_id, self.user.id)
        self.assertEqual(len(UserRole.query.all()), 1)

    def test_member(self):
        resource = UserResource.member(self.user.id, None)
        self.assertEqual(resource.model, self.user)

    def test_member_failure(self):
        error = False
        try:
            UserResource.member(0, None)
        except DoesNotExistError:
            error = True
        self.assertTrue(error)

    def test_delete(self):
        user_id = self.user.id

        self.assertEqual(len(User.query.all()), len(self.users))

        UserResource(self.user, None).delete()

        self.assertIsNone(User.query.get(user_id))
        self.assertEqual(len(User.query.all()), len(self.users) - 1)

    async def test_process_update(self):
        username_new = self.faker.name()

        with patch.object(GenericObject, 'on_callback') as mock_on_callback:
            resource = UserResource(self.user, None)
            await resource.process_update(dict(username=username_new))

            self.assertEqual(User.query.get(self.user.id).username, username_new)
            mock_on_callback.assert_called_once_with(resource=resource)

    async def test_process_update_failure(self):
        username_old = self.user.username
        username_new = self.users[1].username
        resource = UserResource(self.user, None)

        with patch.object(GenericObject, 'on_failure_callback') as mock_on_failure_callback:
            error = False
            try:
                await resource.process_update(dict(username=username_new))
            except Exception:
                error = True

            self.assertTrue(error)
            self.assertEqual(User.query.get(self.user.id).username, username_old)
            mock_on_failure_callback.assert_called_once_with(resource=resource)

    def test_update(self):
        username_new = self.faker.name()
        first_name = self.faker.name()
        last_name = self.faker.name()

        resource = UserResource(self.user, None)
        resource.update(dict(
            first_name=first_name,
            last_name=last_name,
            username=username_new,
        ))

        user = User.query.get(self.user.id)
        self.assertEqual(user.first_name, first_name)
        self.assertEqual(user.last_name, last_name)
        self.assertEqual(user.username, username_new)
