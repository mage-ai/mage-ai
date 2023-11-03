import urllib.parse
import uuid
from typing import Dict
from urllib.parse import urlparse

import aiohttp

from mage_ai.authentication.oauth.constants import OAUTH_PROVIDER_GOOGLE
from mage_ai.authentication.providers.base import BaseProvider
from mage_ai.authentication.providers.oauth import OauthProvider
from mage_ai.settings import ROUTES_BASE_PATH
from mage_ai.settings.sso import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OKTA_DOMAIN_URL


class GoogleProvider(BaseProvider, OauthProvider):
    provider = OAUTH_PROVIDER_GOOGLE

    async def get_auth_url(self, redirect_uri: str = None, **kwargs) -> str:
        parsed_url = urlparse(urllib.parse.unquote(redirect_uri))
        base_url = parsed_url.scheme + '://' + parsed_url.netloc
        if ROUTES_BASE_PATH:
            base_url += f'/{ROUTES_BASE_PATH}'
        redirect_uri_query = urllib.parse.urlencode(
            dict(
                provider=self.provider,
                redirect_uri=redirect_uri,
            )
        )
        query = dict(
            client_id=GOOGLE_CLIENT_ID,
            prompt='select_account',
            redirect_uri=urllib.parse.quote_plus(
                f'{base_url}/oauth?{redirect_uri_query}',
            ),
            scope='https://www.googleapis.com/auth/profile.emails.read https://www.googleapis.com/auth/userinfo.profile',
            state=uuid.uuid4().hex,
        )
        query_strings = []
        for k, v in query.items():
            query_strings.append(f'{k}={v}')

        return f"https://accounts.google.com/o/oauth2/v2/auth?{'&'.join(query_strings)}"

    async def get_access_token_response(self, code: str, **kwargs) -> Dict:
        data = dict()
        async with aiohttp.ClientSession() as session:
            async with session.post(
                'https://oauth2.googleapis.com/token',
                data=dict(
                    code=code,
                    client_id=GOOGLE_CLIENT_ID,
                    client_secret=GOOGLE_CLIENT_SECRET,
                    grant_type='authorization_code',
                ),
                timeout=20,
            ) as response:
                data = await response.json()

        return data

    async def get_user_info(self, access_token: str = None, **kwargs) -> Dict:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                params=dict(access_token=access_token),
                timeout=10,
            ) as response:
                userinfo_resp = await response.json()

        return dict(
            username=userinfo_resp.get('email'),
            email=userinfo_resp.get('email'),
        )
