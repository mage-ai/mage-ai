import os
from datetime import datetime
from uuid import uuid4

from sqlalchemy.orm import load_only

from mage_ai.api.errors import ApiError
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import ScheduleType
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.api.errors import UnauthenticatedRequestException
from mage_ai.settings.utils import base_repo_dirname
from mage_ai.shared.requests import get_bearer_auth_token_from_headers
from mage_ai.shared.utils import clean_name


class ApiRunHandler(BaseHandler):
    @safe_db_query
    def post(self, token: str = None):
        if token is None:
            token = get_bearer_auth_token_from_headers(self.request.headers)
        if not token:
            raise UnauthenticatedRequestException('Invalid token.')

        pipeline_schedule = PipelineSchedule.query.filter(
            PipelineSchedule.schedule_type == ScheduleType.API,
            PipelineSchedule.token == token,
        ).options(load_only('id')).one()
        if not pipeline_schedule:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        payload = self.get_payload().get('run', {})
        pipeline_uuid = payload.get('pipeline_uuid')
        block_uuid = payload.get('block_uuid')
        project = payload.get('project')
        variables = payload.get('variables', {})

        record = payload.get('record', True)
        store_variables = payload.get('store_variables', True)
        run_upstream_blocks = payload.get('run_upstream_blocks', False)
        incomplete_only = payload.get('incomplete_only', False)

        pipeline = Pipeline.get(
            pipeline_uuid,
            repo_path=os.path.join(base_repo_dirname(), project) if project else None,
            check_if_exists=False,
            all_projects=True,
            use_repo_path=True if project else False,
        )
        if not pipeline:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        block = pipeline.get_block(block_uuid)
        if not block:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        pipeline_run = None
        block_run = None

        try:
            if record:
                pipeline_run = PipelineRun.create(
                    completed_at=datetime.utcnow(),
                    create_block_runs=False,
                    execution_date=datetime.utcnow(),
                    started_at=datetime.utcnow(),
                    pipeline_schedule_id=pipeline_schedule.id,
                    pipeline_uuid=pipeline.uuid,
                    status=PipelineRun.PipelineRunStatus.COMPLETED,
                    variables=variables,
                )
                block_run = BlockRun.create(
                    pipeline_run_id=pipeline_run.id,
                    block_uuid=block.uuid,
                    metrics=variables,
                    status=BlockRun.BlockRunStatus.RUNNING,
                    started_at=datetime.utcnow(),
                )

            parts = []
            if pipeline_run:
                parts.append(pipeline_run.execution_partition)
            else:
                parts.extend([
                    str(pipeline_schedule.id),
                    datetime.utcnow().strftime('%Y%m%dT%H%M%S'),
                ])

            execution_partition = os.path.join(
                *parts,
                uuid4().hex,
            )

            logger_manager = LoggerManagerFactory.get_logger_manager(
                pipeline_uuid=clean_name(pipeline.uuid),
                block_uuid=clean_name(block.uuid),
                partition=execution_partition,
                repo_config=pipeline.repo_config,
                repo_path=pipeline.repo_path,
            )

            if run_upstream_blocks:
                block.run_upstream_blocks(
                    incomplete_only=incomplete_only,
                    global_vars=variables,
                )

            output = block.execute_with_callback(
                execution_partition=execution_partition,
                global_vars=variables,
                logging_tags=dict(
                    block_uuid=block.uuid,
                    pipeline_uuid=pipeline.uuid,
                ),
                logger=DictLogger(logger_manager.logger),
                override_outputs=False,
                store_variables=store_variables,
                update_status=False,
                verify_output=False,
            )

            if record:
                block_run.update(
                    completed_at=datetime.utcnow(),
                    status=BlockRun.BlockRunStatus.COMPLETED,
                )
        except Exception as err:
            if record:
                if pipeline_run:
                    pipeline_run.update(
                        status=PipelineRun.PipelineRunStatus.FAILED,
                    )

                if block_run:
                    block_run.update(
                        status=BlockRun.BlockRunStatus.FAILED,
                    )

            raise err

        self.write(dict(
            run=output,
        ))
