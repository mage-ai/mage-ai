import urllib.parse
import uuid
from typing import Awaitable, Dict

import aiohttp
import requests

from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.authentication.providers.oauth import OauthProvider
from mage_ai.authentication.providers.sso import SsoProvider
from mage_ai.authentication.providers.utils import get_base_url
from mage_ai.server.logger import Logger
from mage_ai.settings.sso import OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_DISCOVERY_URL

logger = Logger().new_server_logger(__name__)


class OidcProvider(OauthProvider, SsoProvider):
    provider = ProviderName.OIDC_GENERIC

    def __init__(self):
        self.discovery_url = OIDC_DISCOVERY_URL
        self.client_id = OIDC_CLIENT_ID
        self.client_secret = OIDC_CLIENT_SECRET
        self.__validate()

        self.discover()

    def __validate(self):
        if not self.discovery_url:
            raise Exception(
                'OIDC discovery url is empty. '
                'Make sure the OIDC_DISCOVERY_URL environment variable is set.')
        if not self.client_id:
            raise Exception(
                'OIDC client id is empty. '
                'Make sure the OIDC_CLIENT_ID environment variable is set.')

    def discover(self) -> Dict:
        """
        Call discovery url to get the endpoints for the OIDC server
        """
        try:
            response = requests.get(
                self.discovery_url,
                headers={
                    'Accept': 'application/json',
                },
                timeout=10,
            )

            response.raise_for_status()
        except Exception:
            logger.exception('Could not fetch response from OIDC discovery url')
            raise

        data = response.json()

        self.authorization_endpoint = data.get('authorization_endpoint')
        self.token_endpoint = data.get('token_endpoint')
        self.userinfo_endpoint = data.get('userinfo_endpoint')

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
            response_type='code',
            scope='openid profile email',
            state=uuid.uuid4().hex,
        )
        query_strings = []
        for k, v in query.items():
            query_strings.append(f'{k}={v}')

        return dict(
            url=f"{self.authorization_endpoint}?{'&'.join(query_strings)}",
            redirect_query_params=redirect_uri_query,
        )

    async def get_access_token_response(self, code: str, **kwargs) -> Awaitable[Dict]:
        base_url = get_base_url(kwargs.get('redirect_uri'))
        data = dict()

        payload = dict(
            client_id=self.client_id,
            grant_type='authorization_code',
            code=code,
            redirect_uri=f'{base_url}/oauth',
        )

        if self.client_secret:
            payload['client_secret'] = self.client_secret

        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.token_endpoint,
                headers={
                    'Accept': 'application/json',
                },
                data=payload,
                timeout=20,
            ) as response:
                data = await response.json()

        return data

    async def get_user_info(self, access_token: str = None, **kwargs) -> Awaitable[Dict]:
        if access_token is None:
            raise Exception('Access token is required to fetch user info.')
        async with aiohttp.ClientSession() as session:
            async with session.get(
                self.userinfo_endpoint,
                headers={
                    'Authorization': f'Bearer {access_token}',
                },
                timeout=10,
            ) as response:
                userinfo_resp = await response.json()

        email = userinfo_resp.get('email')

        return dict(
            email=email,
            username=userinfo_resp.get('preferred_username', email),
        )
