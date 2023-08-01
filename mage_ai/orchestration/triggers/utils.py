from datetime import datetime
from time import sleep
from typing import Dict, Optional

from mage_ai.data_integrations.utils.scheduler import initialize_state_and_runs
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.sync.git_sync import get_sync_config
from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.pipeline_scheduler import configure_pipeline_run_payload
from mage_ai.orchestration.triggers.constants import DEFAULT_POLL_INTERVAL
from mage_ai.orchestration.utils.git import log_git_sync, run_git_sync


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
) -> PipelineRun:
    if payload is None:
        payload = {}

    configured_payload, is_integration = configure_pipeline_run_payload(
        pipeline_schedule,
        pipeline.type,
        payload,
    )

    # TODO: make sure git syncs are not run concurrently if there are
    # are a lot of API requests.
    sync_config = get_sync_config()
    git_sync_result = None
    if sync_config and sync_config.sync_on_pipeline_run:
        git_sync_result = run_git_sync(sync_config=sync_config)

    pipeline_run = PipelineRun.create(**configured_payload)

    from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
    pipeline_scheduler = PipelineScheduler(pipeline_run)

    if is_integration:
        initialize_state_and_runs(
            pipeline_run,
            pipeline_scheduler.logger,
            pipeline_run.get_variables(),
        )

    log_git_sync(
        git_sync_result,
        pipeline_scheduler.logger,
        pipeline_scheduler.build_tags(),
    )
    pipeline_scheduler.start(should_schedule=False)

    return pipeline_run
