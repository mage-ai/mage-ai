import os
from datetime import datetime, timedelta
from time import sleep
from typing import Dict, Optional, Tuple

from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import ScheduleStatus
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
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
            else:
                break

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


def create_and_cancel_pipeline_run(
    pipeline: Pipeline,
    pipeline_schedule: PipelineSchedule,
    payload: Dict,
    message: str = None,
) -> PipelineRun:
    from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler

    payload_copy = payload.copy()
    configured_payload, _ = configure_pipeline_run_payload(
        pipeline_schedule,
        pipeline.type,
        payload_copy,
    )
    configured_payload['create_block_runs'] = False
    pipeline_run = PipelineRun.create(**configured_payload)
    if message:
        pipeline_scheduler = PipelineScheduler(pipeline_run)
        pipeline_scheduler.logger.warning(message, **pipeline_scheduler.build_tags())
    pipeline_run.update(status=PipelineRun.PipelineRunStatus.CANCELLED)
    return pipeline_run


def configure_pipeline_run_payload(
    pipeline_schedule: PipelineSchedule,
    pipeline_type: PipelineType,
    payload: Dict = None,
) -> Tuple[Dict, bool]:
    if payload is None:
        payload = dict()

    if not payload.get('variables'):
        payload['variables'] = {}

    payload['pipeline_schedule_id'] = pipeline_schedule.id
    payload['pipeline_uuid'] = pipeline_schedule.pipeline_uuid
    execution_date = payload.get('execution_date')
    if execution_date is None:
        payload['execution_date'] = datetime.utcnow()
    elif not isinstance(execution_date, datetime):
        payload['execution_date'] = datetime.fromisoformat(execution_date)

    # Set execution_partition in variables
    payload['variables']['execution_partition'] = \
        os.sep.join([
            str(pipeline_schedule.id),
            payload['execution_date'].strftime(format='%Y%m%dT%H%M%S_%f'),
        ])

    is_integration = PipelineType.INTEGRATION == pipeline_type
    if is_integration:
        payload['create_block_runs'] = False

    return payload, is_integration


@safe_db_query
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

    # Do not start the pipeline run immediately due to concurrency control
    if should_schedule:
        from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler

        pipeline_scheduler = PipelineScheduler(pipeline_run)

        # if is_integration:
        #     initialize_state_and_runs(
        #         pipeline_run,
        #         pipeline_scheduler.logger,
        #         pipeline_run.get_variables(),
        #     )

        try:
            pipeline_scheduler.start(should_schedule=should_schedule)
        except AssertionError as err:
            if 'can only test a child process' in str(err):
                print(
                    '[WARNING] triggers.utils.create_and_start_pipeline_run '
                    f'({pipeline.uuid} {pipeline_schedule.id}): '
                    f'{err}'
                )
            else:
                raise err

    if ScheduleStatus.ACTIVE != pipeline_schedule.status:
        pipeline_schedule.update(status=ScheduleStatus.ACTIVE)

    return pipeline_run
