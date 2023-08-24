import hashlib
import json
import platform
from datetime import datetime
from typing import Callable, Dict

import aiohttp
import pytz

from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.project import Project
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.shared.environments import get_env
from mage_ai.shared.hash import merge_dict
from mage_ai.usage_statistics.constants import (
    API_ENDPOINT,
    EventActionType,
    EventNameType,
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

    @safe_db_query
    async def pipeline_run_ended(self, pipeline_run: PipelineRun) -> bool:
        """
        Write "pipeline_run_ended" event to Amplitude for the given PipelineRun.

        Args:
            pipeline_run (PipelineRun): pipeline run to use to populate the event

        Returns:
            bool: True if event was successfully uploaded
        """
        if not self.help_improve_mage:
            return False

        pipeline = pipeline_run.pipeline

        if pipeline.type == PipelineType.INTEGRATION:
            pipeline_type = 'integration'
        elif pipeline.type == PipelineType.STREAMING:
            pipeline_type = 'streaming'
        else:
            pipeline_type = 'batch'

        started_at = pipeline_run.started_at \
            if pipeline_run.started_at else pipeline_run.execution_date
        completed_at = pipeline_run.completed_at \
            if pipeline_run.completed_at else datetime.now(tz=pytz.UTC)
        run_time_seconds = completed_at.timestamp() - started_at.timestamp()

        block_configs = pipeline.all_block_configs

        encoded_pipeline_uuid = pipeline.uuid.encode('utf-8')
        data = dict(
            num_pipeline_blocks=len(block_configs),
            pipeline_run_uuid=pipeline_run.id,
            pipeline_status=pipeline_run.status,
            pipeline_type=pipeline_type,
            pipeline_uuid=hashlib.sha256(encoded_pipeline_uuid).hexdigest(),
            run_time_seconds=run_time_seconds,
            trigger_method=pipeline_run.pipeline_schedule.schedule_type,
            unique_block_types=list(set([b.get('type') for b in block_configs])),
            unique_languages=list(set([b.get('language') for b in block_configs])),
        )

        return await self.__send_message(
            data,
            event_name=EventNameType.PIPELINE_RUN_ENDED,
        )

    async def __send_message(
        self,
        data: Dict,
        event_name: EventNameType = EventNameType.USAGE_STATISTIC_CREATE,
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
