from datetime import datetime, timedelta
from time import sleep
from typing import Dict, Optional

from mage_ai.data_integrations.utils.scheduler import initialize_state_and_runs
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.pipeline_scheduler import configure_pipeline_run_payload
from mage_ai.orchestration.triggers.constants import DEFAULT_POLL_INTERVAL


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


def create_and_start_pipeline_run(
    pipeline: Pipeline,
    pipeline_schedule: PipelineSchedule,
    payload: Dict = None,
    should_schedule: bool = False,
) -> PipelineRun:
    if payload is None:
        payload = {}

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
            pipeline_run.get_variables(),
        )

    pipeline_scheduler.start(should_schedule=should_schedule)

    return pipeline_run
