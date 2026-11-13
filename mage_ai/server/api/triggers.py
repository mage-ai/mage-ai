import json
from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import ScheduleType
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.triggers.utils import create_and_start_pipeline_run
from mage_ai.server.api.base import BaseHandler
from mage_ai.server.api.errors import UnauthenticatedRequestException
from mage_ai.shared.requests import get_bearer_auth_token_from_headers


def build_api_trigger_payload(body: bytes) -> Dict:
    payload = {}
    request_payload = json.loads(body) if body else {}

    if isinstance(request_payload, dict):
        pipeline_run_payload = request_payload.get('pipeline_run') or {}
        if isinstance(pipeline_run_payload, dict):
            payload.update(pipeline_run_payload)

        if body:
            payload['event_variables'] = {
                k: v
                for k, v in request_payload.items()
                if k != 'pipeline_run'
            }
    elif body:
        payload['event_variables'] = request_payload

    if 'variables' not in payload:
        payload['variables'] = {}

    return payload


class ApiTriggerPipelineHandler(BaseHandler):
    model_class = PipelineRun

    @safe_db_query
    def post(self, pipeline_schedule_id, token: str = None):
        pipeline_schedule = PipelineSchedule.query.get(int(pipeline_schedule_id))
        if not pipeline_schedule:
            raise ApiError(ApiError.RESOURCE_NOT_FOUND)

        if token is None:
            token = get_bearer_auth_token_from_headers(self.request.headers)

        if ScheduleType.API != pipeline_schedule.schedule_type:
            raise UnauthenticatedRequestException(
                'This endpoint is only supported for API trigger.',
            )
        if not pipeline_schedule.token:
            raise UnauthenticatedRequestException(
                'The token of the API trigger cannot be empty.',
            )

        if ScheduleType.API == pipeline_schedule.schedule_type and \
            pipeline_schedule.token and \
                pipeline_schedule.token != token:
            raise UnauthenticatedRequestException(
                f'Invalid token for pipeline schedule ID {pipeline_schedule_id}.',
            )

        payload = build_api_trigger_payload(self.request.body)

        pipeline = Pipeline.get(
            pipeline_schedule.pipeline_uuid, repo_path=pipeline_schedule.repo_path
        )
        pipeline_run = create_and_start_pipeline_run(
            pipeline,
            pipeline_schedule,
            payload,
            should_schedule=False,
        )

        self.write(dict(pipeline_run=pipeline_run.to_dict()))
