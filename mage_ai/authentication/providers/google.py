import urllib.parse
import uuid
from typing import Awaitable, Dict

import aiohttp

from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.authentication.providers.oauth import OauthProvider
from mage_ai.authentication.providers.sso import SsoProvider
from mage_ai.authentication.providers.utils import get_base_url
from mage_ai.settings import get_settings_value
from mage_ai.settings.keys import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET


class GoogleProvider(SsoProvider, OauthProvider):
    provider = ProviderName.GOOGLE

    def __init__(self):
        self.client_id = get_settings_value(GOOGLE_CLIENT_ID)
        self.client_secret = get_settings_value(GOOGLE_CLIENT_SECRET)
        if not self.client_id:
            raise Exception(
                'Google client id is empty. '
                'Make sure the GOOGLE_CLIENT_ID environment variable is set.')
        if not self.client_secret:
            raise Exception(
                'Google client secret is empty. '
                'Make sure the GOOGLE_CLIENT_SECRET environment variable is set.')

    def get_auth_url_response(self, redirect_uri: str = None, **kwargs) -> Dict:
        base_url = get_base_url(redirect_uri)
        redirect_uri_query = dict(
            provider=self.provider,
            redirect_uri=redirect_uri,
        )
        query = dict(
            client_id=self.client_id,
            prompt='select_account',
            redirect_uri=urllib.parse.quote_plus(
                f'{base_url}/oauth',
            ),
            response_type='code',
            scope='https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',  # noqa: E501
            state=uuid.uuid4().hex,
        )
        query_strings = []
        for k, v in query.items():
            query_strings.append(f'{k}={v}')

        return dict(
            url=f"https://accounts.google.com/o/oauth2/v2/auth?{'&'.join(query_strings)}",
            redirect_query_params=redirect_uri_query,
        )

    async def get_access_token_response(self, code: str, **kwargs) -> Awaitable[Dict]:
        base_url = get_base_url(kwargs.get('redirect_uri'))

        data = dict()
        async with aiohttp.ClientSession() as session:
            async with session.post(
                'https://oauth2.googleapis.com/token',
                data=dict(
                    code=code,
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    redirect_uri=f'{base_url}/oauth',
                    grant_type='authorization_code',
                ),
                timeout=20,
            ) as response:
                data = await response.json()

        return data

    async def get_user_info(self, access_token: str = None, **kwargs) -> Awaitable[Dict]:
        if access_token is None:
            raise Exception('Access token is required to fetch user info.')
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                params=dict(access_token=access_token),
                timeout=10,
            ) as response:
                userinfo_resp = await response.json()

        return dict(
            email=userinfo_resp.get('email'),
            username=userinfo_resp.get('email'),
        )
