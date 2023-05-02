from datetime import datetime, timedelta
from mage_ai.api.resources.PipelineScheduleResource import PipelineScheduleResource
from mage_ai.data_integrations.utils.scheduler import initialize_state_and_runs
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import ScheduleStatus, ScheduleType
from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.pipeline_scheduler import configure_pipeline_run_payload, get_variables
from mage_ai.orchestration.triggers.constants import (
    DEFAULT_POLL_INTERVAL,
    TRIGGER_NAME_FOR_TRIGGER_CREATED_FROM_CODE,
)
from time import sleep
from typing import Dict, Optional


def create_and_start_pipeline_run(
    pipeline: Pipeline,
    pipeline_schedule: PipelineSchedule,
    payload: Dict = {},
) -> PipelineRun:
    configured_payload, is_integration = configure_pipeline_run_payload(
        pipeline_schedule,
        pipeline.type,
        payload,
    )

    pipeline_run = PipelineRun.create(**configured_payload)

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
    pipeline_uuid = pipeline.uuid
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


def check_pipeline_run_status(
    pipeline_run: PipelineRun,
    error_on_failure: bool = False,
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    poll_timeout: Optional[float] = None,
    verbose: bool = True,
) -> PipelineRun:
    pipeline_uuid = pipeline_run.pipeline_uuid

    poll_start = datetime.now()
    while True:
        db_connection.session.refresh(pipeline_run)
        status = pipeline_run.status.value
        message = f'Pipeline run {pipeline_run.id} for pipeline {pipeline_uuid}: {status}.'

        if PipelineRun.PipelineRunStatus.FAILED.value == status:
            if error_on_failure:
                raise Exception(message)

        if verbose:
            print(message)

        if status in [
            PipelineRun.PipelineRunStatus.CANCELLED.value,
            PipelineRun.PipelineRunStatus.COMPLETED.value,
        ]:
            break

        if (
            poll_timeout
            and datetime.now()
            > poll_start + timedelta(seconds=poll_timeout)
        ):
            raise Exception(
                f'Pipeline run {pipeline_run.id} for pipeline {pipeline_uuid}: time out after '
                f'{datetime.now() - poll_start}. Last status was {status}.'
            )

        sleep(poll_interval)

    return pipeline_run


def trigger_pipeline(
    pipeline_uuid: str,
    variables: Dict = {},
    check_status: bool = False,
    error_on_failure: bool = False,
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    poll_timeout: Optional[float] = None,
    verbose: bool = True,
) -> PipelineRun:
    pipeline = Pipeline.get(pipeline_uuid)

    pipeline_schedule = fetch_or_create_pipeline_schedule(pipeline)

    pipeline_run = create_and_start_pipeline_run(
        pipeline,
        pipeline_schedule,
        dict(variables=variables),
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
