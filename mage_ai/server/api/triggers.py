from datetime import datetime
from mage_ai.data_integrations.utils.scheduler import initialize_state_and_runs
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models import PipelineRun, PipelineSchedule
from mage_ai.orchestration.pipeline_scheduler import get_variables
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.api.errors import UnauthenticatedRequestException
import json


class ApiTriggerPipelineHandler(BaseHandler):
    model_class = PipelineRun

    @safe_db_query
    def post(self, pipeline_schedule_id, token: str = None):
        pipeline_schedule = PipelineSchedule.query.get(int(pipeline_schedule_id))

        if PipelineSchedule.ScheduleType.API == pipeline_schedule.schedule_type and \
            pipeline_schedule.token and \
                pipeline_schedule.token != token:
            raise UnauthenticatedRequestException(
                f'Invalid token for pipeline schedule ID {pipeline_schedule_id}.',
            )

        pipeline = Pipeline.get(pipeline_schedule.pipeline_uuid)

        payload = self.get_payload()
        if 'variables' not in payload:
            payload['variables'] = {}

        payload['pipeline_schedule_id'] = pipeline_schedule.id
        payload['pipeline_uuid'] = pipeline_schedule.pipeline_uuid
        if payload.get('execution_date') is None:
            payload['execution_date'] = datetime.utcnow()

        is_integration = PipelineType.INTEGRATION == pipeline.type
        if is_integration:
            payload['create_block_runs'] = False

        body = self.request.body
        if body:
            payload['event_variables'] = {}

            for k, v in json.loads(body).items():
                if k == 'pipeline_run':
                    continue
                payload['event_variables'][k] = v

        pipeline_run = PipelineRun.create(**payload)

        from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
        pipeline_scheduler = PipelineScheduler(pipeline_run)

        if is_integration:
            initialize_state_and_runs(
                pipeline_run,
                pipeline_scheduler.logger,
                get_variables(pipeline_run),
            )
        pipeline_scheduler.start(should_schedule=False)

        self.write(dict(pipeline_run=pipeline_run.to_dict()))
