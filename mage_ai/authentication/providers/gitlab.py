import urllib.parse
import uuid
from typing import Awaitable, Dict

import aiohttp

from mage_ai.authentication.oauth.constants import (
    GITLAB_CLIENT_ID,
    GITLAB_CLIENT_SECRET,
    GITLAB_HOST,
    ProviderName,
)
from mage_ai.authentication.providers.oauth import OauthProvider
from mage_ai.authentication.providers.utils import get_base_url


class GitlabProvider(OauthProvider):
    provider = ProviderName.GITLAB

    def __init__(self):
        self.hostname = GITLAB_HOST or 'https://gitlab.com'
        self.client_id = GITLAB_CLIENT_ID
        self.client_secret = GITLAB_CLIENT_SECRET
        self.__validate()

    def __validate(self):
        if not self.client_id:
            raise Exception(
                'Gitlab client id is empty. '
                'Make sure the GITLAB_CLIENT_ID environment variable is set.')
        if not self.client_secret:
            raise Exception(
                'Gitlab client secret is empty. '
                'Make sure the GITLAB_CLIENT_SECRET environment variable is set.')

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
            state=uuid.uuid4().hex,
            scope='read_user+write_repository+api',
        )
        query_strings = []
        for k, v in query.items():
            query_strings.append(f'{k}={v}')

        return dict(
            url=f"{self.hostname}/oauth/authorize?{'&'.join(query_strings)}",
            redirect_query_params=redirect_uri_query,
        )

    async def get_access_token_response(self, code: str, **kwargs) -> Awaitable[Dict]:
        base_url = get_base_url(kwargs.get('redirect_uri'))
        data = dict()

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{self.hostname}/oauth/token',
                headers={
                    'Accept': 'application/json',
                },
                data=dict(
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    grant_type='authorization_code',
                    code=code,
                    redirect_uri=f'{base_url}/oauth',
                ),
                timeout=20,
            ) as response:
                data = await response.json()

        return data

    async def get_refresh_token_response(self, refresh_token: str) -> Awaitable[Dict]:
        data = dict()

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{self.hostname}/oauth/token',
                headers={
                    'Accept': 'application/json',
                },
                data=dict(
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    grant_type='refresh_token',
                    refresh_token=refresh_token,
                ),
                timeout=20,
            ) as response:
                data = await response.json()

        return data
