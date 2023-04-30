from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.repo_manager import get_repo_config, get_repo_path
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.shared.hash import merge_dict
from mage_ai.usage_statistics.constants import API_ENDPOINT, EventActionType, EventObjectType
from typing import Dict
import aiohttp
import platform
import requests


class UsageStatisticLogger():
    def __init__(self, project = None):
        self.project = project or Project()

    async def project_impression(self) -> bool:
        return await self.__send_message(EventObjectType.PROJECT, EventActionType.IMPRESSION)

    @safe_db_query
    async def user_impression(self) -> bool:
        return await self.__send_message(EventObjectType.USER, EventActionType.IMPRESSION, dict(
            users=User.query.count(),
        ))

    async def __send_message(self, object_name: str, action_name: str, data: Dict = {}) -> bool:
        if not self.project.help_improve_mage:
            return False

        data_to_send = merge_dict(self.__shared_metadata(), data)

        print('WTFFFFFFFFFFFFFF', data_to_send)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    API_ENDPOINT,
                    json=dict(usage_statistics=data_to_send),
                    timeout=3,
                ) as response:
                    response_json = await response.json()
        except Exception:
            pass

        # response = requests.post(
        #     API_ENDPOINT,
        #     json=dict(usage_statistics=data_to_send),
        # )
        # response.json()

    def __shared_metadata(self) -> Dict:
        return dict(
            platform=platform.platform(),
            project_uuid=self.project.project_uuid,
        )

