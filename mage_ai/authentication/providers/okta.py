import urllib.parse
import uuid
from typing import Dict
from urllib.parse import urlparse

import aiohttp

from mage_ai.authentication.oauth.constants import OAUTH_PROVIDER_OKTA
from mage_ai.authentication.providers.base import BaseProvider
from mage_ai.authentication.providers.oauth import OauthProvider
from mage_ai.settings import ROUTES_BASE_PATH
from mage_ai.settings.sso import OKTA_CLIENT_ID, OKTA_CLIENT_SECRET, OKTA_DOMAIN_URL


class OktaProvider(BaseProvider, OauthProvider):
    provider = OAUTH_PROVIDER_OKTA

    def __init__(self):
        self.hostname = OKTA_DOMAIN_URL
        if not self.hostname.startswith('https'):
            self.hostname = f'https://{self.hostname}'

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
            client_id=OKTA_CLIENT_ID,
            redirect_uri=urllib.parse.quote_plus(
                f'{base_url}/oauth?{redirect_uri_query}',
            ),
            response_mode='query',
            response_type='code',
            scope='openid email profile',
            state=uuid.uuid4().hex,
        )
        query_strings = []
        for k, v in query.items():
            query_strings.append(f'{k}={v}')

        return f"{self.hostname}/oauth2/default/v1/authorize?{'&'.join(query_strings)}"

    async def get_access_token_response(self, code: str, **kwargs) -> Dict:
        data = dict()
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{self.hostname}/oauth2/default/v1/token',
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                data=dict(
                    grant_type='authorization_code',
                    code=code,
                ),
                auth=(OKTA_CLIENT_ID, OKTA_CLIENT_SECRET),
                timeout=20,
            ) as response:
                data = await response.json()

        return data

    async def get_user_info(self, access_token: str = None, **kwargs) -> Dict:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f'{self.hostname}/oauth2/default/v1/userinfo',
                headers={
                    'Authorization': f'Bearer {access_token}'
                },
                timeout=10,
            ) as response:
                userinfo_resp = await response.json()

        return dict(
            username=userinfo_resp.get('sub'),
            email=userinfo_resp.get('email'),
        )
