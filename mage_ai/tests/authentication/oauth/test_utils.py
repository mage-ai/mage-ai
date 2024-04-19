import asyncio
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
from uuid import uuid4

from freezegun import freeze_time

from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.authentication.oauth.utils import (
    access_tokens_for_client,
    refresh_token_for_client,
)
from mage_ai.data_preparation.git.utils import get_oauth_client_id
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, Oauth2Application
from mage_ai.tests.base_test import AsyncDBTestCase
from mage_ai.tests.factory import create_user


class OauthUtilsTest(AsyncDBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.provider = ProviderName.GITLAB
        self.client_id = get_oauth_client_id(self.provider)

    def setUp(self):
        self.oauth_application = Oauth2Application.create(
            client_id=self.client_id,
            client_type=Oauth2Application.ClientType.PRIVATE,
            name=self.provider,
        )
        self.user = create_user()

    def tearDown(self):
        Oauth2Application.query.delete()
        Oauth2AccessToken.query.delete()

        super().tearDown()

    def test_access_tokens_for_client(self):
        token = Oauth2AccessToken.create(
            expires=datetime.utcnow() + timedelta(days=1),
            token=uuid4().hex,
            oauth2_application_id=self.oauth_application.id,
        )

        tokens = access_tokens_for_client(self.client_id)

        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].token, token.token)

    def test_access_tokens_for_client_with_user(self):
        Oauth2AccessToken.create(
            expires=datetime.utcnow() + timedelta(days=1),
            token=uuid4().hex,
            oauth2_application_id=self.oauth_application.id,
        )

        self.assertEqual(
            len(access_tokens_for_client(self.client_id, user=self.user)), 0
        )
        self.assertEqual(len(access_tokens_for_client(self.client_id)), 1)

        token = Oauth2AccessToken.create(
            expires=datetime.utcnow() + timedelta(days=1),
            token=uuid4().hex,
            oauth2_application_id=self.oauth_application.id,
            user_id=self.user.id,
        )
        tokens = access_tokens_for_client(self.client_id, user=self.user)
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].token, token.token)

    @freeze_time('2024-02-06 04:00:00')
    @patch(
        'mage_ai.authentication.providers.gitlab.GITLAB_CLIENT_ID',
        'test_client_id',
    )
    @patch(
        'mage_ai.authentication.providers.gitlab.GITLAB_CLIENT_SECRET',
        'test_client_secret',
    )
    async def test_refresh_token_for_client(self):
        Oauth2AccessToken.create(
            expires=datetime.utcnow() - timedelta(days=1),
            token='test_token',
            refresh_token='test_refresh_token',
            oauth2_application_id=self.oauth_application.id,
        )
        provider_instance = MagicMock()
        provider_instance.provider = self.provider

        future = asyncio.Future()
        future.set_result(
            {
                'access_token': 'new',
                'refresh_token': 'new_refresh',
                'expires_in': 3600,
            }
        )
        provider_instance.get_refresh_token_response.return_value = future
        new_token = await refresh_token_for_client(self.client_id, provider_instance)

        self.assertEqual(new_token.token, 'new')
        self.assertEqual(new_token.refresh_token, 'new_refresh')
        self.assertEqual(new_token.expires, datetime(2024, 2, 6, 5, 0))
