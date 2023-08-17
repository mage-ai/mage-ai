import json
import platform
from typing import Callable, Dict

import aiohttp

from mage_ai.data_preparation.models.project import Project
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.shared.environments import get_env
from mage_ai.shared.hash import merge_dict
from mage_ai.usage_statistics.constants import (
    API_ENDPOINT,
    EventActionType,
    EventObjectType,
)


class UsageStatisticLogger():
    def __init__(self, project=None):
        self.project = project or Project()

    @property
    def help_improve_mage(self) -> bool:
        return self.project.help_improve_mage

    async def project_impression(self) -> bool:
        if not self.help_improve_mage:
            return False

        features = {}

        for k, v in (self.project.features or {}).items():
            features[k] = 1 if v else 0

        if self.project.repo_config.openai_api_key and \
                len(self.project.repo_config.openai_api_key) >= 1:

            features['openai'] = 1
        else:
            features['openai'] = 0

        return await self.__send_message(
            dict(
                object=EventObjectType.PROJECT,
                action=EventActionType.IMPRESSION,
                features=features,
            ),
        )

    @safe_db_query
    async def pipeline_runs_impression(self, count_func: Callable) -> bool:
        if not self.help_improve_mage:
            return False

        return await self.__send_message(
            dict(
                object=EventObjectType.PIPELINE_RUN,
                action=EventActionType.IMPRESSION,
                pipeline_runs=count_func(),
            ),
        )

    async def pipelines_impression(self, count_func: Callable) -> bool:
        if not self.help_improve_mage:
            return False

        return await self.__send_message(
            dict(
                object=EventObjectType.PIPELINE,
                action=EventActionType.IMPRESSION,
                pipelines=count_func(),
            ),
        )

    @safe_db_query
    async def users_impression(self) -> bool:
        if not self.help_improve_mage:
            return False

        return await self.__send_message(
            dict(
                object=EventObjectType.USER,
                action=EventActionType.IMPRESSION,
                users=User.query.count(),
            ),
        )
    
    async def pipeline_run_started(self) -> bool:
        if not self.help_improve_mage:
            return False
    
        return await self.__send_message(
            EventObjectType.PIPELINE_RUN,
            EventActionType.STARTED)


    async def __send_message(
        self,
        data: Dict,
        event_name: str = 'usage_statistic.create',
    ) -> bool:
        if data is None:
            data = {}

        data_to_send = merge_dict(
            self.__shared_metadata(),
            data,
        )

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    API_ENDPOINT,
                    json=dict(
                        api_key='KwnbpKJNe6gOjC2X5ilxafFvxbNppiIfGejB2hlY',
                        event_name=event_name,
                        usage_statistics=data_to_send,
                    ),
                    timeout=3,
                ) as response:
                    response_json = await response.json()
                    if response_json.get('success'):
                        print(json.dumps(data_to_send, indent=2))
                        return True
        except Exception as err:
            print(f'Error: {err}')

        return False

    def __shared_metadata(self) -> Dict:
        return dict(
            environment=get_env(),
            platform=platform.platform(),
            project_uuid=self.project.project_uuid,
            version=self.project.version,
        )
