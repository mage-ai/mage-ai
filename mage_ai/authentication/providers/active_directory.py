import json
import uuid
from typing import Awaitable, Dict
from urllib.parse import quote_plus

import aiohttp

from mage_ai.authentication.oauth.constants import (
    ACTIVE_DIRECTORY_CLIENT_ID as ACTIVE_DIRECTORY_MAGE_CLIENT_ID,
)
from mage_ai.authentication.oauth.constants import ProviderName
from mage_ai.authentication.providers.oauth import OauthProvider
from mage_ai.authentication.providers.sso import SsoProvider
from mage_ai.authentication.providers.utils import get_base_url
from mage_ai.server.logger import Logger
from mage_ai.settings import get_settings_value
from mage_ai.settings.keys import (
    ACTIVE_DIRECTORY_CLIENT_ID,
    ACTIVE_DIRECTORY_CLIENT_SECRET,
    ACTIVE_DIRECTORY_DIRECTORY_ID,
    ACTIVE_DIRECTORY_ROLES_MAPPING,
)

logger = Logger().new_server_logger(__name__)


class ADProvider(SsoProvider, OauthProvider):
    provider = ProviderName.ACTIVE_DIRECTORY
    scope = 'User.Read'

    def __init__(self):
        self.directory_id = get_settings_value(ACTIVE_DIRECTORY_DIRECTORY_ID)
        self.client_id = get_settings_value(ACTIVE_DIRECTORY_CLIENT_ID)
        self.client_secret = get_settings_value(ACTIVE_DIRECTORY_CLIENT_SECRET)
        self.__validate()

        self.roles_mapping = {}
        roles_mapping = get_settings_value(ACTIVE_DIRECTORY_ROLES_MAPPING)
        if roles_mapping:
            try:
                self.roles_mapping = json.loads(roles_mapping)
            except Exception:
                logger.exception('Failed to parse roles mapping.')

    def __validate(self):
        if not self.directory_id:
            raise Exception(
                'AD directory id is empty. '
                'Make sure the ACTIVE_DIRECTORY_DIRECTORY_ID environment variable is set.'
            )
        if self.client_id and not self.client_secret:
            raise Exception(
                'AD client secret is empty. '
                'Make sure the ACTIVE_DIRECTORY_CLIENT_SECRET environment variable is set.'
            )

    def get_auth_url_response(self, redirect_uri: str = None, **kwargs) -> Dict:
        """
        For active directory, the user can set up the Oauth provider in two different ways. They
        can either just set the ACTIVE_DIRECTORY_DIRECTORY_ID which will use the Mage application we
        set up in Azure. They can additionally set the ACTIVE_DIRECTORY_CLIENT_ID and
        ACTIVE_DIRECTORY_CLIENT_SECRET which will use their own Mage application in Azure.
        """
        ad_directory_id = self.directory_id
        if self.client_id:
            base_url = get_base_url(redirect_uri)
            redirect_uri_query = dict(
                provider=self.provider,
                redirect_uri=redirect_uri,
            )
            query = dict(
                client_id=self.client_id,
                redirect_uri=quote_plus(
                    f'{base_url}/oauth',
                ),
                response_type='code',
                scope=self.scope,
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
                scope=self.scope,
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
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    code=code,
                    grant_type='authorization_code',
                    redirect_uri=f'{base_url}/oauth',
                    tenant=self.directory_id,
                ),
                timeout=20,
            ) as response:
                data = await response.json()

        return data

    async def get_user_info(
        self, access_token: str = None, **kwargs
    ) -> Awaitable[Dict]:
        if access_token is None:
            raise Exception('Access token is required to fetch user info.')

        mage_roles = []
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

            if self.roles_mapping:
                try:
                    async with session.get(
                        f'https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId eq \'{self.client_id}\'&$select=id',  # noqa: E501
                        headers={
                            'Content-Type': 'application\\json',
                            'Authorization': f'Bearer {access_token}',
                        },
                        timeout=10,
                    ) as response:
                        service_principals = await response.json()

                    resource_id = service_principals.get('value')[0].get('id')

                    async with session.get(
                        f'https://graph.microsoft.com/v1.0/servicePrincipals/{resource_id}/appRoles',  # noqa: E501
                        headers={
                            'Content-Type': 'application\\json',
                            'Authorization': f'Bearer {access_token}',
                        },
                        timeout=10,
                    ) as response:
                        app_roles = await response.json()

                    app_role_mapping = {
                        app_role.get('id'): app_role.get('value')
                        for app_role in app_roles.get('value')
                    }

                    async with session.get(
                        f'https://graph.microsoft.com/v1.0/me/appRoleAssignments?$filter=resourceId eq {resource_id}',  # noqa: E501
                        headers={
                            'Content-Type': 'application\\json',
                            'Authorization': f'Bearer {access_token}',
                        },
                        timeout=10,
                    ) as response:
                        app_role_assignments = await response.json()

                    for assignment in app_role_assignments.get('value'):
                        app_role_id = assignment.get('appRoleId')
                        app_role = app_role_mapping.get(app_role_id)
                        if app_role and app_role in self.roles_mapping:
                            mage_roles.append(self.roles_mapping[app_role])
                except Exception:
                    logger.exception(
                        'Failed to map Active Directory roles to Mage roles.'
                    )

        return dict(
            email=userinfo_resp.get('userPrincipalName'),
            username=userinfo_resp.get('userPrincipalName'),
            user_roles=mage_roles,
        )
