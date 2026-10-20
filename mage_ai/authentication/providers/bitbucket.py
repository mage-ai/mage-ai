import urllib.parse
import uuid
from typing import Awaitable, Dict

import aiohttp
from aiohttp import BasicAuth

from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.authentication.providers.oauth import OauthProvider
from mage_ai.authentication.providers.utils import get_base_url
from mage_ai.settings import get_settings_value
from mage_ai.settings.keys import (
    BITBUCKET_HOST,
    BITBUCKET_OAUTH_KEY,
    BITBUCKET_OAUTH_SECRET,
)


class BitbucketProvider(OauthProvider):
    provider = ProviderName.BITBUCKET

    def __init__(self):
        self.hostname = get_settings_value(BITBUCKET_HOST) or 'https://bitbucket.org'
        self.key = get_settings_value(BITBUCKET_OAUTH_KEY)
        self.secret = get_settings_value(BITBUCKET_OAUTH_SECRET)
        self.__validate()

    def __validate(self):
        if not self.key:
            raise Exception(
                'Bitbucket OAuth key is empty. '
                'Make sure the BITBUCKET_OAUTH_KEY environment variable is set.')
        if not self.secret:
            raise Exception(
                'Bitbucket OAuth secret is empty. '
                'Make sure the BITBUCKET_OAUTH_SECRET environment variable is set.')

    def get_auth_url_response(self, redirect_uri: str = None, **kwargs) -> Dict:
        base_url = get_base_url(redirect_uri)
        redirect_uri_query = dict(
            provider=self.provider,
            redirect_uri=redirect_uri,
        )
        query = dict(
            client_id=self.key,
            redirect_uri=urllib.parse.quote_plus(
                f'{base_url}/oauth',
            ),
            response_type='code',
            state=uuid.uuid4().hex,
        )
        query_strings = []
        for k, v in query.items():
            query_strings.append(f'{k}={v}')

        return dict(
            url=f"{self.hostname}/site/oauth2/authorize?{'&'.join(query_strings)}",
            redirect_query_params=redirect_uri_query,
        )

    async def get_access_token_response(self, code: str, **kwargs) -> Awaitable[Dict]:
        base_url = get_base_url(kwargs.get('redirect_uri'))
        data = dict()
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{self.hostname}/site/oauth2/access_token',
                headers={
                    'Accept': 'application/json',
                },
                data=dict(
                    grant_type='authorization_code',
                    code=code,
                    redirect_uri=f'{base_url}/oauth',
                ),
                auth=BasicAuth(self.key, self.secret),
                timeout=20,
            ) as response:
                data = await response.json()

        return data

    async def get_refresh_token_response(self, refresh_token: str) -> Awaitable[Dict]:
        data = dict()

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'{self.hostname}/site/oauth2/access_token',
                headers={
                    'Accept': 'application/json',
                },
                data=dict(
                    grant_type='refresh_token',
                    refresh_token=refresh_token,
                ),
                auth=BasicAuth(self.key, self.secret),
                timeout=20,
            ) as response:
                data = await response.json()

        return data
