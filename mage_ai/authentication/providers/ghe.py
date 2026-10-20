import urllib.parse
import uuid
from typing import Awaitable, Dict

import aiohttp

from mage_ai.authentication.oauth.constants import ProviderName, get_ghe_hostname
from mage_ai.authentication.providers.oauth import OauthProvider
from mage_ai.authentication.providers.utils import get_base_url
from mage_ai.settings import get_settings_value
from mage_ai.settings.keys import GHE_CLIENT_ID, GHE_CLIENT_SECRET


class GHEProvider(OauthProvider):
    provider = ProviderName.GHE

    def __init__(self):
        self.hostname = get_ghe_hostname()
        self.client_id = get_settings_value(GHE_CLIENT_ID)
        self.client_secret = get_settings_value(GHE_CLIENT_SECRET)
        self.__validate()

    def __validate(self):
        if not self.hostname:
            raise Exception(
                'GHE hostname is empty. '
                'Make sure the GHE_HOSTNAME environment variable is set.')
        if not self.client_id:
            raise Exception(
                'GHE client id is empty. '
                'Make sure the GHE_CLIENT_ID environment variable is set.')
        if not self.client_secret:
            raise Exception(
                'GHE client secret is empty. '
                'Make sure the GHE_CLIENT_SECRET environment variable is set.')

    def get_auth_url_response(self, redirect_uri: str = None, **kwargs) -> Dict:
        base_url = get_base_url(redirect_uri)
        redirect_uri_query = dict(
            provider=self.provider,
            redirect_uri=redirect_uri,
        )
        query = dict(
            client_id=self.client_id,
            redirect_uri=urllib.parse.quote_plus(
                f'{base_url}/oauth',
            ),
            scope='repo',
            state=uuid.uuid4().hex,
        )
        query_strings = []
        for k, v in query.items():
            query_strings.append(f'{k}={v}')

        return dict(
            url=f"{self.hostname}/login/oauth/authorize?{'&'.join(query_strings)}",
            redirect_query_params=redirect_uri_query,
        )

    async def get_access_token_response(self, code: str, **kwargs) -> Awaitable[Dict]:
        data = dict()
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{self.hostname}/login/oauth/access_token',
                headers={
                    'Accept': 'application/json',
                },
                data=dict(
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    code=code,
                ),
                timeout=20,
            ) as response:
                data = await response.json()

        return data
