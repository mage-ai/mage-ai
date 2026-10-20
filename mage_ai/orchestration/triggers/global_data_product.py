import asyncio
import json
from datetime import datetime, timedelta, timezone
from logging import Logger
from time import sleep
from typing import Dict, List, Optional, Union

from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.models.block.remote.models import RemoteBlock
from mage_ai.data_preparation.models.global_data_product import GlobalDataProduct
from mage_ai.data_preparation.models.triggers import ScheduleStatus, ScheduleType
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.orchestration.triggers.constants import (
    DEFAULT_POLL_INTERVAL,
    TRIGGER_NAME_FOR_GLOBAL_DATA_PRODUCT,
)
from mage_ai.orchestration.triggers.utils import create_and_start_pipeline_run
from mage_ai.orchestration.utils.distributed_lock import DistributedLock
from mage_ai.shared.hash import group_by, merge_dict

BLOCK_RUN_SLEEP_SECONDS = 10

lock = DistributedLock()


@safe_db_query
def __check_block_runs(
    global_data_product: GlobalDataProduct,
    block,
    logger: Logger = None,
    logging_tags: Dict = None,
):
    """
    Check if other block runs with a block that uses the same GDP are running at the same time.

    1. Get all the blocks that use the same GDP by loading all the pipelines’ metadata.yaml
    2. Get all block runs with the same block_uuid as the blocks above that have a running status
    3. Sort the block runs by ID
    4. If the 1st block run’s block_uuid is the same as the block.uuid from the argument, continue
        - If not, then all blocks sleep for 10 seconds.
    """

    from mage_ai.data_preparation.models.pipeline import Pipeline

    pipeline_uuids_and_repo_path = Pipeline.get_all_pipelines_all_projects(include_repo_path=True)

    async def __get_pipelines(pipeline_uuids_and_repo_path=pipeline_uuids_and_repo_path):
        return await asyncio.gather(
            *[Pipeline.load_metadata(
                uuid,
                raise_exception=False,
                repo_path=repo_path,
            ) for uuid, repo_path in pipeline_uuids_and_repo_path],
        )

    pipeline_dicts = asyncio.run(__get_pipelines())

    block_uuids = []
    for pipeline_dict in pipeline_dicts:
        for block_dict in (pipeline_dict.get('blocks', []) or []):
            uuid = ((block_dict.get('configuration') or {}).get('global_data_product') or {}).get(
                'uuid',
            )
            if uuid and uuid == global_data_product.uuid:
                block_uuid = block_dict.get('uuid')
                if block_uuid:
                    block_uuids.append(block_uuid)

    tags = merge_dict(logging_tags, dict(
        block_uuids=block_uuids,
        global_data_product=global_data_product.to_dict(),
    ))
    log_message = (
        f'Number of blocks that use Global Data Product {global_data_product.uuid}'
        f': {len(block_uuids)}'
    )
    if logger:
        logger.info(log_message, tags=tags)
    else:
        print(log_message)
        print(json.dumps(tags, indent=2))

    block_runs = (
        BlockRun.
        select(
            BlockRun.block_uuid,
            BlockRun.id,
        ).
        filter(
            BlockRun.block_uuid.in_(block_uuids),
            BlockRun.status == BlockRun.BlockRunStatus.RUNNING,
        ).
        order_by(BlockRun.id.asc()).
        all()
    )

    tags.update(dict(block_run_ids=[br.id for br in block_runs]))
    log_message = (
        f'Block runs currently running that use Global Data Product {global_data_product.uuid}'
        f': {len(block_runs)}'
    )
    if logger:
        if isinstance(logger, DictLogger):
            logger.info(log_message, tags=tags)
        else:
            logger.info(log_message)
            logger.info(json.dumps(tags, indent=2))
    else:
        print(log_message)
        print(json.dumps(tags, indent=2))

    if len(block_runs) >= 1:
        block_run = block_runs[0]
        block_uuid = block_run.block_uuid
        if block.uuid != block_uuid:
            log_message = (
                f'Block run {block_run.id} for block {block_uuid} will run first'
                f', block run for block {block.uuid} will wait {BLOCK_RUN_SLEEP_SECONDS} '
                'seconds before executing.'
            )
            if logger:
                logger.info(log_message, tags=tags)
            else:
                print(log_message)
                print(json.dumps(tags, indent=2))
            sleep(BLOCK_RUN_SLEEP_SECONDS)


@safe_db_query
def trigger_and_check_status(
    global_data_product: GlobalDataProduct,
    variables: Dict = None,
    block=None,
    check_status: bool = True,
    error_on_failure: bool = True,
    from_notebook: bool = False,
    logger: Logger = None,
    logging_tags: Dict = None,
    poll_interval: float = DEFAULT_POLL_INTERVAL,
    poll_timeout: Optional[float] = None,
    round_number: int = 0,
    verbose: bool = True,
    should_schedule: bool = False,
    remote_blocks: List[Union[Dict, RemoteBlock]] = None,
):
    tags = merge_dict(logging_tags, dict(
        block_uuid=block.uuid if block else None,
        global_data_product=global_data_product.to_dict(),
        round_number=round_number,
    ))

    def __log(log_message: str, logger=logger, tags=tags):
        if logger:
            if isinstance(logger, DictLogger):
                logger.info(log_message, tags=tags)
            else:
                logger.info(log_message)
                logger.info(json.dumps(tags, indent=2))
        else:
            print(log_message)
            print(json.dumps(tags, indent=2))

    pipeline_run = None
    pipeline_run_created = None
    tries = 0

    if block and not from_notebook:
        __check_block_runs(
            global_data_product,
            block,
            logger=logger,
            logging_tags=logging_tags,
        )

    poll_start = datetime.utcnow().replace(tzinfo=timezone.utc)
    while True:
        pipeline_runs = global_data_product.pipeline_runs()

        # Check if most recent pipeline run has failed, canceled, or report the status
        if (tries >= 1 or round_number >= 1) and len(pipeline_runs) >= 1:
            pipeline_run = pipeline_runs[0]
            status = pipeline_run.status.value
            message = (
                f'Pipeline run {pipeline_run.id} for '
                f'global data product {global_data_product.uuid}: {status}.'
            )

            if error_on_failure and PipelineRun.PipelineRunStatus.FAILED == status:
                raise Exception(message)

            if verbose:
                __log(message)

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
                diff = (
                    datetime.utcnow().replace(tzinfo=timezone.utc).timestamp() -
                    pipeline_run_created.created_at.timestamp()
                )
                __log(
                    f'Pipeline run {pipeline_run.id} was already created '
                    f'{round(diff)} seconds ago at '
                    f'{pipeline_run_created.created_at}; moving on to the next stage.'
                )
                break

            is_outdated, is_outdated_after = global_data_product.is_outdated(pipeline_run)
            if not is_outdated or not is_outdated_after:
                next_run_at = global_data_product.next_run_at(pipeline_run)

                if next_run_at:
                    execution_date = pipeline_run.execution_date
                    seconds = next_run_at.timestamp() - now.timestamp()

                    if is_outdated:
                        if is_outdated_after:
                            __log(
                                f'Global data product {global_data_product.uuid} is outdated.',
                            )
                        else:
                            arr = []
                            for k, d in global_data_product.is_outdated_after(
                                return_values=True,
                            ).items():
                                current = d.get('current')
                                value = d.get('value')
                                arr.append(f'{k.replace("_", " ")}: {value} (currently {current})')

                            __log(
                                f'Global data product {global_data_product.uuid} '
                                'is not yet outdated. '
                                'It’ll be outdated after a specific moment in time - '
                                f'{", ".join(arr)}'
                            )
                    else:
                        __log(
                            f'Global data product {global_data_product.uuid} is up-to-date: '
                            f'most recent pipeline run {pipeline_run.id} '
                            f'executed at {execution_date.isoformat()}. '
                            f'Will be outdated after {next_run_at.isoformat()} '
                            f'in {round(seconds)} seconds.'
                        )
                else:
                    __log(
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
                __log(
                    f'Deleted pipeline run {pr.id} for '
                    f'global data product {global_data_product.uuid}: '
                    'overlaps with a previous pipeline run.'
                )
        elif pipeline_runs_count == 0:
            if tries == 0:
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
                        remote_blocks=remote_blocks,
                        should_schedule=should_schedule,
                    )
                    if pipeline_run_created:
                        __log(
                            f'Created pipeline run {pipeline_run_created.id} for '
                            f'global data product {global_data_product.uuid}.'
                        )
                        pipeline_run = pipeline_run_created

                    lock.release_lock(__lock_key_for_creating_pipeline_run(global_data_product))
            else:
                __log(
                    f'No pipeline run for global data product {global_data_product.uuid} '
                    f'was created after attempt {tries} '
                    f'by block {block.uuid} ' if block else ''
                    f'in round {round_number}; moving on to round {round_number}'
                    f' in {poll_interval} seconds.' if poll_interval is not None else '.'
                )
                sleep(poll_interval)
                trigger_and_check_status(
                    global_data_product=global_data_product,
                    variables=variables,
                    block=block,
                    check_status=check_status,
                    error_on_failure=error_on_failure,
                    round_number=round_number + 1,
                    logger=logger,
                    logging_tags=logging_tags,
                    poll_interval=poll_interval,
                    poll_timeout=poll_timeout,
                    verbose=verbose,
                    should_schedule=should_schedule,
                    remote_blocks=remote_blocks,
                )
                break
        else:
            ids = sorted([f'{pr.id} ({pr.pipeline_uuid})' for pr in pipeline_runs])
            __log(
                'Pipeline runs for '
                f'global data product {global_data_product.uuid} '
                f'already exist and are currently running: {", ".join(ids)}.'
            )

        if check_status:
            tries += 1
            __log(
                f'Round {tries}: status check for global data product {global_data_product.uuid}, '
                f'finished; will check again after {poll_interval} seconds.'
            )
            sleep(poll_interval)
        else:
            break

    return pipeline_run or pipeline_run_created


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
