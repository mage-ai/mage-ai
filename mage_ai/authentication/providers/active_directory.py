import json
import uuid
from typing import Awaitable, Dict
from urllib.parse import quote_plus

import aiohttp

from mage_ai.authentication.oauth.constants import (
    ACTIVE_DIRECTORY_CLIENT_ID as ACTIVE_DIRECTORY_MAGE_CLIENT_ID,
)
from mage_ai.authentication.oauth.constants import OAUTH_PROVIDER_ACTIVE_DIRECTORY
from mage_ai.authentication.providers.oauth import OauthProvider
from mage_ai.authentication.providers.sso import SsoProvider
from mage_ai.authentication.providers.utils import get_base_url
from mage_ai.settings import ACTIVE_DIRECTORY_DIRECTORY_ID
from mage_ai.settings.sso import (
    ACTIVE_DIRECTORY_CLIENT_ID,
    ACTIVE_DIRECTORY_CLIENT_SECRET,
)


class ADProvider(SsoProvider, OauthProvider):
    provider = OAUTH_PROVIDER_ACTIVE_DIRECTORY

    def __init__(self):
        self.__validate()

    def __validate(self):
        if not ACTIVE_DIRECTORY_DIRECTORY_ID:
            raise Exception(
                'AD directory id is empty. '
                'Make sure the ACTIVE_DIRECTORY_DIRECTORY_ID environment variable is set.')
        if ACTIVE_DIRECTORY_CLIENT_ID and not ACTIVE_DIRECTORY_CLIENT_SECRET:
            raise Exception(
                'AD client secret is empty. '
                'Make sure the ACTIVE_DIRECTORY_CLIENT_SECRET environment variable is set.')

    def get_auth_url_response(self, redirect_uri: str = None, **kwargs) -> Dict:
        """
        For active directory, the user can set up the Oauth provider in two different ways. They
        can either just set the ACTIVE_DIRECTORY_DIRECTORY_ID which will use the Mage application we
        set up in Azure. They can additionally set the ACTIVE_DIRECTORY_CLIENT_ID and
        ACTIVE_DIRECTORY_CLIENT_SECRET which will use their own Mage application in Azure.
        """
        ad_directory_id = ACTIVE_DIRECTORY_DIRECTORY_ID
        if ACTIVE_DIRECTORY_CLIENT_ID:
            base_url = get_base_url(redirect_uri)
            redirect_uri_query = dict(
                provider=self.provider,
                redirect_uri=redirect_uri,
            )
            query = dict(
                client_id=ACTIVE_DIRECTORY_CLIENT_ID,
                redirect_uri=quote_plus(
                    f'{base_url}/oauth',
                ),
                response_type='code',
                scope='User.Read',
                state=uuid.uuid4().hex,
            )
            query_strings = []
            for k, v in query.items():
                query_strings.append(f'{k}={v}')

            return dict(
                url=f"https://login.microsoftonline.com/{ad_directory_id}/oauth2/v2.0/authorize?{'&'.join(query_strings)}",  # noqa: E501
                redirect_query_params=redirect_uri_query,
            )
        else:
            from requests.models import PreparedRequest

            req = PreparedRequest()
            req.prepare_url(redirect_uri, dict(provider=self.provider))
            query = dict(
                client_id=ACTIVE_DIRECTORY_MAGE_CLIENT_ID,
                redirect_uri=f'https://api.mage.ai/v1/oauth/{self.provider}',
                response_type='code',
                scope='User.Read',
                state=quote_plus(
                    json.dumps(
                        dict(
                            redirect_uri=req.url,
                            tenant_id=ad_directory_id,
                        )
                    )
                ),
            )
            query_strings = []
            for k, v in query.items():
                query_strings.append(f'{k}={v}')

            return dict(
                url=f"https://login.microsoftonline.com/{ad_directory_id}/oauth2/v2.0/authorize?{'&'.join(query_strings)}",  # noqa: E501
            )

    async def get_access_token_response(self, code: str, **kwargs) -> Awaitable[Dict]:
        base_url = get_base_url(kwargs.get('redirect_uri'))

        async with aiohttp.ClientSession() as session:
            async with session.post(
                'https://login.microsoftonline.com/organizations/oauth2/v2.0/token',
                headers={
                    'Accept': 'application/json',
                },
                data=dict(
                    client_id=ACTIVE_DIRECTORY_CLIENT_ID,
                    client_secret=ACTIVE_DIRECTORY_CLIENT_SECRET,
                    code=code,
                    grant_type='authorization_code',
                    redirect_uri=f'{base_url}/oauth',
                    tenant=ACTIVE_DIRECTORY_DIRECTORY_ID,
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
                'https://graph.microsoft.com/v1.0/me',
                headers={
                    'Content-Type': 'application\\json',
                    'Authorization': f'Bearer {access_token}',
                },
                timeout=10,
            ) as response:
                userinfo_resp = await response.json()

        return dict(
            email=userinfo_resp.get('userPrincipalName'),
            username=userinfo_resp.get('userPrincipalName'),
        )
