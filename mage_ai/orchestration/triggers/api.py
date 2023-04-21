from datetime import datetime
from mage_ai.data_integrations.utils.scheduler import initialize_state_and_runs
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import ScheduleStatus, ScheduleType
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.pipeline_scheduler import get_variables
from mage_ai.orchestration.triggers.constants import TRIGGER_NAME_FOR_TRIGGER_CREATED_FROM_CODE
from typing import Dict


def create_and_start_pipeline_run(
    pipeline: Pipeline,
    pipeline_schedule: PipelineSchedule,
    payload: Dict = {},
) -> PipelineRun:
    payload['pipeline_schedule_id'] = pipeline_schedule.id
    payload['pipeline_uuid'] = pipeline_schedule.pipeline_uuid
    if payload.get('execution_date') is None:
        payload['execution_date'] = datetime.utcnow()

    is_integration = PipelineType.INTEGRATION == pipeline.type
    if is_integration:
        payload['create_block_runs'] = False

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

    return pipeline_run


def fetch_or_create_pipeline_schedule(pipeline: Pipeline) -> PipelineSchedule:
    pipeline_uuid = pipeline.pipeline_uuid
    schedule_name = TRIGGER_NAME_FOR_TRIGGER_CREATED_FROM_CODE
    schedule_type = ScheduleType.API

    pipeline_schedule = PipelineSchedule.query.filter(
        PipelineSchedule.name == schedule_name,
        PipelineSchedule.pipeline_uuid == pipeline_uuid,
        PipelineSchedule.schedule_type == schedule_type,
    ).first()

    if not pipeline_schedule:
        resource = PipelineScheduleResource.create(
            dict(
                name=schedule_name,
                schedule_type=schedule_type,
                start_time=datetime.utcnow(),
                status=ScheduleStatus.ACTIVE,
            ),
            None,
            parent_model=pipeline,
        )
        pipeline_schedule = resource.model

    return pipeline_schedule


def check_pipeline_run_status(pipeline_run: PipelineRun):
    pass


def trigger_pipeline():
    fetch_or_create_pipeline_schedule
    create_and_start_pipeline_run
    check_pipeline_run_status
