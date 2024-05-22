import hashlib
import json
import platform
import socket
from datetime import datetime
from typing import Callable, Dict, List, Union

import aiohttp
import pytz

from mage_ai.api.operations.constants import OperationType
from mage_ai.cache.block_action_object.constants import (
    OBJECT_TYPE_BLOCK_FILE,
    OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE,
    OBJECT_TYPE_MAGE_TEMPLATE,
)
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dynamic.utils import (
    is_dynamic_block,
    is_dynamic_block_child,
    is_replicated_block,
    should_reduce_output,
)
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.custom_templates.custom_block_template import (
    CustomBlockTemplate,
)
from mage_ai.data_preparation.models.custom_templates.custom_pipeline_template import (
    CustomPipelineTemplate,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.project import Project
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.oauth import User
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.shared.environments import get_env, is_debug, is_test
from mage_ai.shared.hash import merge_dict
from mage_ai.usage_statistics.constants import (
    API_ENDPOINT,
    EventActionType,
    EventNameType,
    EventObjectType,
)
from mage_ai.usage_statistics.utils import build_event_data_for_chart


class UsageStatisticLogger():
    def __init__(
        self,
        context_data: Dict = None,
        project=None,
        repo_path: str = None,
    ):
        self.project = project or Project(context_data=context_data, repo_path=repo_path)

    async def block_create(
        self,
        block: Block,
        block_action_object: Dict = None,
        custom_template: CustomBlockTemplate = None,
        payload_config: Dict = None,
        pipeline: Pipeline = None,
        replicated_block: Block = None,
    ) -> bool:
        event_properties = dict(
            block=dict(
                language=block.language,
                type=block.type,
            ),
        )

        created_from = None
        if block_action_object and block_action_object.get('object_type'):
            created_from = 'block_action_object'
            object_type = block_action_object.get('object_type')

            if OBJECT_TYPE_BLOCK_FILE == object_type:
                created_from = 'existing_block'
            elif OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE == object_type:
                created_from = 'custom_template'
            elif OBJECT_TYPE_MAGE_TEMPLATE == object_type:
                created_from = 'mage_template'
        elif custom_template:
            created_from = 'custom_template'
        elif replicated_block:
            created_from = 'replicated_block'
        elif payload_config and payload_config.get('template_path'):
            created_from = 'mage_template'
        elif block.already_exists:
            created_from = 'existing_block'

        if created_from:
            event_properties['action_properties'] = dict(
                created_from=created_from,
            )

            if block_action_object and block_action_object.get('object_type'):
                event_properties['action_properties']['block_action_object_type'] = \
                    block_action_object.get('object_type')

            if payload_config and payload_config.get('template_path'):
                event_properties['action_properties']['template_path'] = payload_config.get(
                    'template_path',
                )

        if pipeline:
            event_properties['pipeline'] = dict(
                type=pipeline.type,
            )

        return await self.__send_message(merge_dict(dict(
                action=EventActionType.CREATE,
                object=EventObjectType.BLOCK,
            ),
            event_properties,
        ))

    @property
    def help_improve_mage(self) -> bool:
        return self.project.help_improve_mage

    async def chart_impression(self, chart_config: Dict) -> bool:
        return await self.__send_message(
            dict(
                action=EventActionType.IMPRESSION,
                chart=build_event_data_for_chart(chart_config),
                object=EventObjectType.CHART,
            ),
        )

    async def custom_template_create(
        self,
        custom_template: Union[CustomBlockTemplate, CustomPipelineTemplate],
    ) -> bool:
        event_properties = {}

        if isinstance(custom_template, CustomBlockTemplate):
            event_properties['block'] = dict(
                language=custom_template.language,
                type=custom_template.block_type,
            )
        elif isinstance(custom_template, CustomPipelineTemplate):
            if custom_template.pipeline:
                event_properties['pipeline'] = dict(
                    type=custom_template.pipeline.get('type'),
                )

        return await self.__send_message(merge_dict(dict(
                action=EventActionType.CREATE,
                object=EventObjectType.CUSTOM_TEMPLATE,
            ),
            event_properties,
        ))

    async def project_deny_improve_mage(self, project_uuid) -> bool:
        return await self.__send_message(
            data=dict(
                object=EventObjectType.PROJECT,
                action=EventActionType.DENY,
            ),
            override_validation=True,
            project_uuid=project_uuid,
        )

    async def error(
        self,
        event_name: EventNameType,
        code: int = None,
        errors: List[str] = None,
        message: str = None,
        type: str = None,
        operation: OperationType = None,
        resource: str = None,
        resource_id: str = None,
        resource_parent: str = None,
        resource_parent_id: str = None,
    ) -> bool:
        resource_id_hashed = None
        if resource_id is not None:
            resource_id_hashed = hash(str(resource_id))

        resource_parent_id_hashed = None
        if resource_parent_id is not None:
            resource_parent_id_hashed = hash(str(resource_parent_id))

        if message and str(resource_id) in message:
            message = message.replace(str(resource_id), str(resource_id_hashed))
        if message and str(resource_parent_id) in message:
            message = message.replace(str(resource_parent_id), str(resource_parent_id_hashed))

        return await self.__send_message(
            data=dict(
                object=EventObjectType.ERROR,
                action=EventActionType.IMPRESSION,
                operation=operation,
                resource=resource,
                resource_id=resource_id_hashed,
                resource_parent=resource_parent,
                resource_parent_id=resource_parent_id_hashed,
                code=code,
                errors=errors,
                message=message,
                type=type,
            ),
            event_name=event_name,
        )

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

    async def pipeline_create(
        self,
        pipeline: Pipeline,
        clone_pipeline_uuid: str = None,
        llm_payload: Dict = None,
        template_uuid: str = None,
    ) -> bool:
        event_properties = dict(
            pipeline=dict(
                type=pipeline.type,
            ),
        )

        created_from = None
        if clone_pipeline_uuid:
            created_from = 'clone'
        elif llm_payload:
            created_from = 'llm'
        elif template_uuid:
            created_from = 'custom_template'

        if created_from:
            event_properties['action_properties'] = dict(
                created_from=created_from,
            )

        return await self.__send_message(merge_dict(dict(
                action=EventActionType.CREATE,
                object=EventObjectType.PIPELINE,
            ),
            event_properties,
        ))

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
        pipeline_schedule = pipeline_run.pipeline_schedule
        data = dict(
            landing_time_enabled=1 if pipeline_schedule.landing_time_enabled() else 0,
            num_pipeline_blocks=len(block_configs),
            pipeline_run_uuid=pipeline_run.id,
            pipeline_status=pipeline_run.status,
            pipeline_type=pipeline_type,
            pipeline_uuid=hashlib.sha256(encoded_pipeline_uuid).hexdigest(),
            run_time_seconds=run_time_seconds,
            trigger_method=pipeline_schedule.schedule_type,
            unique_block_types=list(set([b.get('type') for b in block_configs])),
            unique_languages=list(set([b.get('language') for b in block_configs])),
        )

        return await self.__send_message(
            data,
            event_name=EventNameType.PIPELINE_RUN_ENDED,
        )

    @safe_db_query
    async def block_run_ended(self, block_run: BlockRun) -> bool:
        if not self.help_improve_mage:
            return False

        pipeline_run = block_run.pipeline_run
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

        encoded_block_uuid = block_run.block_uuid.encode('utf-8')
        block_language = None
        block_type = None
        dynamic_block = False
        dynamic_block_child = False
        replicated_block = False
        reduce_output = False

        block = pipeline.get_block(block_run.block_uuid)
        if block:
            block_language = block.language
            block_type = block.type
            dynamic_block = is_dynamic_block(block)
            dynamic_block_child = is_dynamic_block_child(block)
            replicated_block = is_replicated_block(block)
            reduce_output = should_reduce_output(block)

        encoded_pipeline_uuid = pipeline.uuid.encode('utf-8')
        pipeline_schedule = pipeline_run.pipeline_schedule
        data = dict(
            action=EventActionType.EXECUTE,
            object=EventObjectType.BLOCK_RUN,
            landing_time_enabled=1 if pipeline_schedule.landing_time_enabled() else 0,
            num_pipeline_blocks=len(block_configs),
            block_uuid=hashlib.sha256(encoded_block_uuid).hexdigest(),
            block_language=block_language,
            block_type=block_type,
            block_dynamic_block=dynamic_block,
            block_dynamic_block_child=dynamic_block_child,
            block_replicated_block=replicated_block,
            block_reduce_output=reduce_output,
            block_run_status=block_run.status,
            block_run_uuid=block_run.id,
            pipeline_run_uuid=pipeline_run.id,
            pipeline_status=pipeline_run.status,
            pipeline_type=pipeline_type,
            pipeline_uuid=hashlib.sha256(encoded_pipeline_uuid).hexdigest(),
            run_time_seconds=run_time_seconds,
            trigger_method=pipeline_schedule.schedule_type,
            unique_block_types=list(set([b.get('type') for b in block_configs])),
            unique_languages=list(set([b.get('language') for b in block_configs])),
        )

        return await self.__send_message(
            data,
            event_name=EventNameType.BLOCK_RUN_ENDED,
        )

    async def __send_message(
        self,
        data: Dict,
        event_name: EventNameType = EventNameType.USAGE_STATISTIC_CREATE,
        override_validation: bool = False,
        project_uuid: str = None,
    ) -> bool:
        if not override_validation:
            if is_test():
                return False

            if not self.help_improve_mage:
                return False

        if data is None:
            data = {}

        data_to_send = merge_dict(
            self.__shared_metadata(),
            data,
        )

        if project_uuid and not data_to_send.get('project_uuid'):
            data_to_send['project_uuid'] = project_uuid

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
                        if is_debug():
                            print(json.dumps(data_to_send, indent=2))
                        return True
        except Exception as err:
            print(f'[Statistics] Message: {err}')
        return False

    def __shared_metadata(self) -> Dict:
        return dict(
            environment=get_env(),
            hostname=self.__get_host(),
            platform=platform.platform(),
            project_uuid=self.project.project_uuid,
            version=self.project.version,
        )

    def __get_host(self):
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return 'unknown'
