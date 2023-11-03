import os
from typing import Dict, List

import aiohttp
import requests
from sl_userservices_client.policy_evaluator import PolicyEvaluator
from sl_userservices_client.resource_id import ResourceId
from sl_userservices_client.user_services_client import UserServicesClient

from mage_ai.orchestration.db.models.oauth import Role

SYSTEMLINK_UI_URL_ENV_VAR = 'SYSTEMLINK_UI_URL'
SYSTEMLINK_WORKSPACE_ID_ENV_VAR = 'SYSTEMLINK_WORKSPACE_ID'

class Systemlink:
    def __init__(
        self,
        session_id: str,
        systemlink_url: str = None,
        workspace_id: str = None,
    ):
        self.systemlink_url = systemlink_url
        if self.systemlink_url is None:
            self.systemlink_url = os.getenv(SYSTEMLINK_UI_URL_ENV_VAR)

        self.workspace_id = workspace_id
        if self.workspace_id is None:
            self.workspace_id = os.getenv(SYSTEMLINK_WORKSPACE_ID_ENV_VAR)

        self.session_id = session_id
        self.policies = None

    async def get_auth_response(self) -> Dict:
        url = self.systemlink_url + '/niauth/v1/auth'

        headers = {
            'Accept': 'application/json',
            'Cookie': 'session-id={};'.format(self.session_id),
        }

        auth_response = dict()
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                headers=headers,
                timeout=20,
            ) as response:
                auth_response = await response.json()

        return auth_response


    async def get_user_info(self, auth_response: Dict = None) -> Dict:
        if not auth_response:
            auth_response = await self.get_auth_response()

        is_error = auth_response is None or auth_response.get('error') is not None
        if not is_error:
            user_info = auth_response.get('user')
            if not user_info:
                is_error = True

        if is_error:
            raise Exception('Login to SLE required, go to /login?redirectUri=...')

        return user_info

    async def get_user_roles(self, auth_response: Dict = None, **kwargs) -> List[Role]:
        if auth_response is None:
            auth_response = await self.get_auth_response()

        policies_json = auth_response.get('policies')

        policies = UserServicesClient._convert_to_auth_policies(policies_json)

        resource_id = ResourceId("Notebook", self.workspace_id)

        can_create = PolicyEvaluator.is_resource_allowed(
            resource_id, "webapp:CreateWebApp", policies
        )
        if can_create:
            return [Role.get_role(Role.DefaultRole.OWNER)]

        can_read = PolicyEvaluator.is_resource_allowed(
            resource_id, "webapp:GetWebApp", policies
        )
        if can_read:
            return [Role.get_role(Role.DefaultRole.VIEWER)]

        raise Exception('User is not allowed for this workspace')
