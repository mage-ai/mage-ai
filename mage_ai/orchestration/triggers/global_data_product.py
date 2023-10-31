from datetime import datetime, timedelta, timezone
from time import sleep
from typing import Dict, List, Optional

from mage_ai.data_preparation.models.global_data_product import GlobalDataProduct
from mage_ai.data_preparation.models.triggers import ScheduleStatus, ScheduleType
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.triggers.constants import (
    DEFAULT_POLL_INTERVAL,
    TRIGGER_NAME_FOR_GLOBAL_DATA_PRODUCT,
)
from mage_ai.orchestration.triggers.utils import create_and_start_pipeline_run
from mage_ai.orchestration.utils.distributed_lock import DistributedLock
from mage_ai.shared.hash import group_by

lock = DistributedLock()


def trigger_and_check_status(
    global_data_product: GlobalDataProduct,
    variables: Dict = None,
    check_status: bool = True,
    error_on_failure: bool = True,
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    poll_timeout: Optional[float] = None,
    verbose: bool = True,
    should_schedule: bool = False,
):
    pipeline_run_created = None
    tries = 0

    poll_start = datetime.utcnow().replace(tzinfo=timezone.utc)
    while True:
        pipeline_runs = global_data_product.pipeline_runs()

        # Check if most recent pipeline run has failed, canceled, or report the status
        if tries >= 1 and len(pipeline_runs) >= 1:
            pipeline_run = pipeline_runs[0]
            status = pipeline_run.status.value
            message = (
                f'Pipeline run {pipeline_run.id} for '
                f'global data product {global_data_product.uuid}: {status}.'
            )

            if error_on_failure and PipelineRun.PipelineRunStatus.FAILED == status:
                raise Exception(message)

            if verbose:
                print(message)

            if PipelineRun.PipelineRunStatus.CANCELLED == status:
                break

        # Check if polling has timed out
        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        if (
            poll_timeout is not None and
            now > poll_start + timedelta(seconds=poll_timeout)
        ):
            raise Exception(
                f'Pipeline run {pipeline_run.id} for '
                f'global data product {global_data_product.uuid}: timed out after '
                f'{now - poll_start}. Last status was {status}.'
            )

        pipeline_runs_by_status = group_by(lambda x: x.status, pipeline_runs)

        # Check if global data product is outdated
        completed_pipeline_runs = sorted(pipeline_runs_by_status.get(
            PipelineRun.PipelineRunStatus.COMPLETED,
            [],
        ), key=lambda x: x.execution_date, reverse=True)
        if len(completed_pipeline_runs) >= 1:
            pipeline_run = completed_pipeline_runs[0]

            if pipeline_run_created and pipeline_run_created.id == pipeline_run.id:
                break

            is_outdated, is_outdated_after = global_data_product.is_outdated(pipeline_run)
            if not is_outdated or not is_outdated_after:
                if verbose:
                    next_run_at = global_data_product.next_run_at(pipeline_run)

                    if next_run_at:
                        execution_date = pipeline_run.execution_date
                        seconds = next_run_at.timestamp() - now.timestamp()

                        if not is_outdated:
                            print(
                                f'Global data product {global_data_product.uuid} is up-to-date: '
                                f'most recent pipeline run {pipeline_run.id} '
                                f'executed at {execution_date.isoformat()}. '
                                f'Will be outdated after {next_run_at.isoformat()} '
                                f'in {round(seconds)} seconds.'
                            )
                        elif not is_outdated_after:
                            arr = []
                            for k, d in global_data_product.is_outdated_after(
                                return_values=True,
                            ).items():
                                current = d.get('current')
                                value = d.get('value')
                                arr.append(f'{k.replace("_", " ")}: {value} (currently {current})')

                            print(
                                f'Global data product {global_data_product.uuid} '
                                'is not yet outdated. '
                                'It’ll be outdated after a specific moment in time - '
                                f'{", ".join(arr)}'
                            )
                    else:
                        print(
                            f'Global data product {global_data_product.uuid} has no outdated at '
                            'configured. '
                            'You must configure when the global data product is outdated at '
                            'in order for it to run.'
                        )

                break

        # Handle pipeline run(s) that are currently running
        pipeline_runs = sorted(pipeline_runs_by_status.get(
            PipelineRun.PipelineRunStatus.RUNNING,
            [],
        ), key=lambda x: x.execution_date, reverse=True)
        pipeline_runs_count = len(pipeline_runs)

        # If there is more than 1 pipeline running, delete some of them
        if pipeline_runs_count >= 2:
            duplicate_pipeline_runs = __clean_up_pipeline_runs(global_data_product, pipeline_runs)
            for pr in duplicate_pipeline_runs:
                if verbose:
                    print(
                        f'Deleted pipeline run {pr.id} for '
                        f'global data product {global_data_product.uuid}: '
                        'overlaps with a previous pipeline run.'
                    )
        elif pipeline_runs_count == 0 and tries == 0:
            if lock.try_acquire_lock(
                __lock_key_for_creating_pipeline_run(global_data_product),
                timeout=10,
            ):
                pipeline_schedule = fetch_or_create_pipeline_schedule(global_data_product)
                if pipeline_schedule.status != ScheduleStatus.ACTIVE:
                    pipeline_schedule.update(status=ScheduleStatus.ACTIVE)
                pipeline_run_created = create_and_start_pipeline_run(
                    global_data_product.pipeline,
                    pipeline_schedule,
                    dict(variables=variables),
                    should_schedule=should_schedule,
                )
                if pipeline_run_created:
                    if verbose:
                        print(
                            f'Created pipeline run {pipeline_run_created.id} for '
                            f'global data product {global_data_product.uuid}.'
                        )

                lock.release_lock(__lock_key_for_creating_pipeline_run(global_data_product))

        if check_status:
            tries += 1
            sleep(poll_interval)
        else:
            break


def fetch_or_create_pipeline_schedule(global_data_product: GlobalDataProduct) -> PipelineSchedule:
    pipeline_uuid = global_data_product.object_uuid
    schedule_name = TRIGGER_NAME_FOR_GLOBAL_DATA_PRODUCT
    schedule_type = ScheduleType.TIME

    def __get_and_clean_up_pipeline_schedule() -> PipelineSchedule:
        pipeline_schedules = (
            PipelineSchedule.
            repo_query.
            filter(
                PipelineSchedule.global_data_product_uuid == global_data_product.uuid,
                PipelineSchedule.name == schedule_name,
                PipelineSchedule.pipeline_uuid == pipeline_uuid,
                PipelineSchedule.schedule_type == schedule_type,
            ).
            order_by(PipelineSchedule.created_at.asc()).
            all()
        )

        if len(pipeline_schedules) >= 1:
            pipeline_schedule = pipeline_schedules[0]

            if len(pipeline_schedules) >= 2:
                for ps in pipeline_schedules[1:]:
                    ps.delete()

            return pipeline_schedule

    pipeline_schedule = __get_and_clean_up_pipeline_schedule()

    if pipeline_schedule:
        return pipeline_schedule
    elif lock.try_acquire_lock(
        __lock_key_for_creating_pipeline_schedule(global_data_product),
        timeout=10,
    ):
        pipeline_schedule = PipelineSchedule.create(
            global_data_product_uuid=global_data_product.uuid,
            name=schedule_name,
            pipeline_uuid=pipeline_uuid,
            schedule_type=schedule_type,
        )
        lock.release_lock(__lock_key_for_creating_pipeline_schedule(global_data_product))

    tries = 0
    while not pipeline_schedule and tries < 12:
        sleep(5)
        pipeline_schedule = __get_and_clean_up_pipeline_schedule()
        tries += 1

    return pipeline_schedule


def __clean_up_pipeline_runs(
    global_data_product: GlobalDataProduct,
    pipeline_runs: List[PipelineRun],
) -> List[PipelineRun]:
    arr = []

    outdated_at_delta = global_data_product.get_outdated_at_delta(in_seconds=True)

    pipeline_runs_count = len(pipeline_runs)
    prs = sorted(pipeline_runs, key=lambda x: x.execution_date, reverse=True)
    for idx, pipeline_run in enumerate(prs):
        if idx == pipeline_runs_count - 1:
            continue

        previous_pipeline_run = prs[idx + 1]

        # If the time between the recent run and the previous run is less than
        # the time it takes for the global data product to be outdated, then
        # delete the recent run.
        seconds_between_runs = (
            pipeline_run.execution_date - previous_pipeline_run.execution_date
        ).total_seconds()

        if seconds_between_runs < outdated_at_delta:
            arr.append(pipeline_run)

    PipelineRun.query.filter(PipelineRun.id.in_([pr.id for pr in arr])).delete()

    return arr


def __lock_key_for_creating_pipeline_run(global_data_product: GlobalDataProduct) -> str:
    return f'global_data_product:{global_data_product.uuid}:create_pipeline_run'


def __lock_key_for_creating_pipeline_schedule(global_data_product: GlobalDataProduct) -> str:
    return f'global_data_product:{global_data_product.uuid}:create_pipeline_schedule'
