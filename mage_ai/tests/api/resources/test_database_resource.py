import secrets

from mage_ai.api.resources.DatabaseResource import DatabaseResource
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.tests.api.operations.test_base import BaseApiTestCase


class TestResource(DatabaseResource):
    model_class = User


class DatabaseResourceTest(BaseApiTestCase):
    async def test_process_collection(self):
        user = secrets.token_urlsafe()
        options = dict(lightning=4, rock=5)

        user1 = User.create(username='Darrow')
        user2 = User.create(username='Sevro')
        user3 = User.create(username='Cassius')
        users = [
            user1,
            user2,
            user3,
        ]

        result_set = await TestResource.process_collection(
            {},
            {},
            user,
            **options,
        )

        self.assertEqual([r.model for r in result_set], users)
        self.assertEqual(result_set.metadata, dict(
            count=len(users),
            next=False,
        ))

        result_set = await TestResource.process_collection(
            dict(username=user1.username),
            {},
            user,
            **options,
        )

        self.assertEqual([r.model for r in result_set], [user1])
        self.assertEqual(result_set.metadata, dict(
            count=1,
            next=False,
        ))

        result_set = await TestResource.process_collection(
            {},
            dict(_limit=2),
            user,
            **options,
        )

        self.assertEqual([r.model for r in result_set], users[:2])
        self.assertEqual(result_set.metadata, dict(
            count=3,
            next=True,
        ))

        result_set = await TestResource.process_collection(
            {},
            dict(_limit=2, _offset=1),
            user,
            **options,
        )

        self.assertEqual([r.model for r in result_set], users[1:])
        self.assertEqual(result_set.metadata, dict(
            count=3,
            next=False,
        ))
