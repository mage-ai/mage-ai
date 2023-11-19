from datetime import datetime
from typing import Dict, Optional

from mage_ai.api.resources.PipelineScheduleResource import PipelineScheduleResource
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import ScheduleStatus, ScheduleType
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.triggers.constants import (
    DEFAULT_POLL_INTERVAL,
    TRIGGER_NAME_FOR_TRIGGER_CREATED_FROM_CODE,
)
from mage_ai.orchestration.triggers.utils import (
    check_pipeline_run_status,
    create_and_start_pipeline_run,
)


def trigger_pipeline(
    pipeline_uuid: str,
    variables: Dict = None,
    check_status: bool = False,
    error_on_failure: bool = False,
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    poll_timeout: Optional[float] = None,
    schedule_name: str = None,
    verbose: bool = True,
    _should_schedule: bool = False,  # For internal use only (e.g. running hooks from notebook).
) -> PipelineRun:
    if variables is None:
        variables = {}
    pipeline = Pipeline.get(pipeline_uuid)

    pipeline_schedule = __fetch_or_create_pipeline_schedule(pipeline, schedule_name=schedule_name)

    pipeline_run = create_and_start_pipeline_run(
        pipeline,
        pipeline_schedule,
        dict(variables=variables),
        should_schedule=_should_schedule,
    )

    if check_status:
        pipeline_run = check_pipeline_run_status(
            pipeline_run,
            error_on_failure=error_on_failure,
            poll_interval=poll_interval,
            poll_timeout=poll_timeout,
            verbose=verbose,
        )

    return pipeline_run


def __fetch_or_create_pipeline_schedule(
    pipeline: Pipeline,
    schedule_name: str = None,
) -> PipelineSchedule:
    if schedule_name is None:
        schedule_name = TRIGGER_NAME_FOR_TRIGGER_CREATED_FROM_CODE

    pipeline_uuid = pipeline.uuid
    schedule_type = ScheduleType.API

    pipeline_schedule = PipelineSchedule.repo_query.filter(
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
