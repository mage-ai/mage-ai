import asyncio
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from freezegun import freeze_time

from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.authentication.oauth.utils import refresh_token_for_client
from mage_ai.data_preparation.git.api import get_oauth_client_id
from mage_ai.orchestration.db.models.oauth import Oauth2AccessToken, Oauth2Application
from mage_ai.tests.base_test import AsyncDBTestCase


class OauthUtilsTest(AsyncDBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.provider = ProviderName.GITLAB
        self.client_id = get_oauth_client_id(self.provider)
        self.oauth_application = Oauth2Application.create(
            client_id=self.client_id,
            client_type=Oauth2Application.ClientType.PRIVATE,
            name=self.provider,
        )

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
        future.set_result({
            'access_token': 'new',
            'refresh_token': 'new_refresh',
            'expires_in': 3600,
        })
        provider_instance.get_refresh_token_response.return_value = future
        new_token = await refresh_token_for_client(self.client_id, provider_instance)

        self.assertEqual(new_token.token, 'new')
        self.assertEqual(new_token.refresh_token, 'new_refresh')
        self.assertEqual(new_token.expires, datetime(2024, 2, 6, 5, 0))
