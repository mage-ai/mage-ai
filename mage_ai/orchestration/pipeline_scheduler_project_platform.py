import asyncio
import collections
import os
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, List, Set, Tuple

import pytz
from dateutil.relativedelta import relativedelta
from sqlalchemy import desc, func

from mage_ai.data_integrations.utils.scheduler import (
    clear_source_output_files,
    get_extra_variables,
    initialize_state_and_runs,
)
from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.constants import ExecutorType, PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
    get_triggers_by_pipeline,
)
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.data_preparation.sync.git_sync import get_sync_config
from mage_ai.orchestration.concurrency import ConcurrencyConfig, OnLimitReached
from mage_ai.orchestration.db import db_connection, safe_db_query
from mage_ai.orchestration.db.models.schedules import (
    Backfill,
    BlockRun,
    EventMatcher,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.orchestration.job_manager import JobType, job_manager
from mage_ai.orchestration.metrics.pipeline_run import (
    calculate_destination_metrics,
    calculate_pipeline_run_metrics,
    calculate_source_metrics,
)
from mage_ai.orchestration.notification.config import NotificationConfig
from mage_ai.orchestration.notification.sender import NotificationSender
from mage_ai.orchestration.utils.distributed_lock import DistributedLock
from mage_ai.orchestration.utils.git import log_git_sync, run_git_sync
from mage_ai.orchestration.utils.resources import get_compute, get_memory
from mage_ai.server.logger import Logger
from mage_ai.settings import HOSTNAME
from mage_ai.settings.platform import (
    project_platform_activated,
    repo_path_from_database_query_to_project_repo_path,
)
from mage_ai.settings.platform.utils import get_pipeline_from_platform
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.dates import compare
from mage_ai.shared.environments import get_env
from mage_ai.shared.hash import index_by, merge_dict
from mage_ai.shared.retry import retry
from mage_ai.usage_statistics.logger import UsageStatisticLogger

MEMORY_USAGE_MAXIMUM = 0.95

lock = DistributedLock()
logger = Logger().new_server_logger(__name__)


class PipelineScheduler:
    def __init__(
        self,
        pipeline_run: PipelineRun,
    ) -> None:
        self.pipeline_run = pipeline_run
        self.pipeline_schedule = pipeline_run.pipeline_schedule
        self.pipeline = get_pipeline_from_platform(
            pipeline_run.pipeline_uuid,
            repo_path=self.pipeline_schedule.repo_path if self.pipeline_schedule else None,
        )

        # Get the list of integration stream if the pipeline is data integration pipeline
        self.streams = []
        if self.pipeline.type == PipelineType.INTEGRATION:
            try:
                self.streams = self.pipeline.streams(
                    self.pipeline_run.get_variables(
                        extra_variables=get_extra_variables(self.pipeline)
                    )
                )
            except Exception:
                logger.exception(f'Fail to get streams for {pipeline_run}')
                traceback.print_exc()

        # Initialize the logger
        self.logger_manager = LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline.uuid,
            partition=self.pipeline_run.execution_partition,
            repo_config=self.pipeline.repo_config,
        )
        self.logger = DictLogger(self.logger_manager.logger)

        # Initialize the notification sender
        self.notification_sender = NotificationSender(
            NotificationConfig.load(
                config=merge_dict(
                    self.pipeline.repo_config.notification_config,
                    self.pipeline.notification_config,
                )
            )
        )

        self.concurrency_config = ConcurrencyConfig.load(
            config=self.pipeline.concurrency_config
        )

        # Other pipeline scheduling settings
        self.allow_blocks_to_fail = (
            self.pipeline_schedule.get_settings().allow_blocks_to_fail
            if self.pipeline_schedule else False
        )

    @safe_db_query
    def start(self, should_schedule: bool = True) -> bool:
        """Start the pipeline run.

        This method starts the pipeline run by performing necessary actions
        * Update the pipeline run status
        * Optionally scheduling the pipeline execution

        Args:
            should_schedule (bool, optional): Flag indicating whether to schedule
                the pipeline execution. Defaults to True.

        Returns:
            bool: Whether the pipeline run is started successfully
        """
        if self.pipeline_run.status == PipelineRun.PipelineRunStatus.RUNNING:
            return True

        lock_key = f'pipeline_run_{self.pipeline_run.id}'
        if not lock.try_acquire_lock(lock_key):
            return

        tags = self.build_tags()

        is_integration = PipelineType.INTEGRATION == self.pipeline.type

        try:
            block_runs = BlockRun.query.filter(
                BlockRun.pipeline_run_id == self.pipeline_run.id).all()

            if len(block_runs) == 0:
                if is_integration:
                    clear_source_output_files(
                        self.pipeline_run,
                        self.logger,
                    )
                    initialize_state_and_runs(
                        self.pipeline_run,
                        self.logger,
                        self.pipeline_run.get_variables(),
                    )
                else:
                    self.pipeline_run.create_block_runs()
        except Exception as e:
            error_msg = 'Fail to initialize block runs.'
            self.logger.exception(
                error_msg,
                **merge_dict(tags, dict(
                    error=e,
                )),
            )
            self.pipeline_run.update(status=PipelineRun.PipelineRunStatus.FAILED)
            self.notification_sender.send_pipeline_run_failure_message(
                pipeline=self.pipeline,
                pipeline_run=self.pipeline_run,
                error=error_msg,
            )
            return False
        finally:
            lock.release_lock(lock_key)

        self.pipeline_run.update(
            started_at=datetime.now(tz=pytz.UTC),
            status=PipelineRun.PipelineRunStatus.RUNNING,
        )
        if should_schedule:
            self.schedule()
        return True

    @safe_db_query
    def stop(self) -> None:
        stop_pipeline_run(
            self.pipeline_run,
            self.pipeline,
        )

    @safe_db_query
    def schedule(self, block_runs: List[BlockRun] = None) -> None:
        if not lock.try_acquire_lock(f'pipeline_run_{self.pipeline_run.id}', timeout=10):
            return

        self.__run_heartbeat()

        for b in self.pipeline_run.block_runs:
            b.refresh()

        if PipelineType.STREAMING == self.pipeline.type:
            self.__schedule_pipeline()
        else:
            schedule = PipelineSchedule.get(
                self.pipeline_run.pipeline_schedule_id,
            )
            backfills = schedule.backfills if schedule else []
            backfill = backfills[0] if len(backfills) >= 1 else None

            if backfill is not None and \
                backfill.status == Backfill.Status.INITIAL and \
                    self.pipeline_run.status == PipelineRun.PipelineRunStatus.RUNNING:
                backfill.update(
                    status=Backfill.Status.RUNNING,
                )

            if self.pipeline_run.all_blocks_completed(self.allow_blocks_to_fail):
                if PipelineType.INTEGRATION == self.pipeline.type:
                    tags = self.build_tags()
                    calculate_pipeline_run_metrics(
                        self.pipeline_run,
                        logger=self.logger,
                        logging_tags=tags,
                    )

                if self.pipeline_run.any_blocks_failed():
                    self.pipeline_run.update(
                        status=PipelineRun.PipelineRunStatus.FAILED,
                        completed_at=datetime.now(tz=pytz.UTC),
                    )
                    failed_block_runs = self.pipeline_run.failed_block_runs
                    error_msg = 'Failed blocks: '\
                                f'{", ".join([b.block_uuid for b in failed_block_runs])}.'
                    self.notification_sender.send_pipeline_run_failure_message(
                        error=error_msg,
                        pipeline=self.pipeline,
                        pipeline_run=self.pipeline_run,
                    )
                else:
                    self.pipeline_run.complete()
                    self.notification_sender.send_pipeline_run_success_message(
                        pipeline=self.pipeline,
                        pipeline_run=self.pipeline_run,
                    )

                asyncio.run(UsageStatisticLogger().pipeline_run_ended(self.pipeline_run))

                self.logger_manager.output_logs_to_destination()

                if schedule:
                    if backfill is not None:
                        """
                        Exclude old pipeline run retries associated with the backfill
                        (if a backfill's runs had failed and the backfill was retried, those
                        previous runs are no longer relevant) and check if the backfill's
                        latest pipeline runs with different execution dates were successfull.
                        """
                        latest_pipeline_runs = \
                            PipelineSchedule.fetch_latest_pipeline_runs_without_retries(
                                [backfill.pipeline_schedule_id]
                            )
                        if all([PipelineRun.PipelineRunStatus.COMPLETED == pr.status
                                for pr in latest_pipeline_runs]):
                            backfill.update(
                                completed_at=datetime.now(tz=pytz.UTC),
                                status=Backfill.Status.COMPLETED,
                            )
                            schedule.update(
                                status=ScheduleStatus.INACTIVE,
                            )
                    # If running once, update the schedule to inactive when pipeline run is done
                    elif schedule.status == ScheduleStatus.ACTIVE and \
                            schedule.schedule_type == ScheduleType.TIME and \
                            schedule.schedule_interval == ScheduleInterval.ONCE:

                        schedule.update(status=ScheduleStatus.INACTIVE)
            elif self.__check_pipeline_run_timeout():
                status = (
                    self.pipeline_schedule.timeout_status
                    or PipelineRun.PipelineRunStatus.FAILED
                )
                self.pipeline_run.update(status=status)

                self.on_pipeline_run_failure('Pipeline run timed out.')
            elif self.pipeline_run.any_blocks_failed() and not self.allow_blocks_to_fail:
                self.pipeline_run.update(
                    status=PipelineRun.PipelineRunStatus.FAILED)

                # Backfill status updated to "failed" if at least 1 of its pipeline runs failed
                if backfill is not None:
                    latest_pipeline_runs = \
                        PipelineSchedule.fetch_latest_pipeline_runs_without_retries(
                            [backfill.pipeline_schedule_id]
                        )
                    if any(
                        [PipelineRun.PipelineRunStatus.FAILED == pr.status
                            for pr in latest_pipeline_runs]
                    ):
                        backfill.update(
                            status=Backfill.Status.FAILED,
                        )

                failed_block_runs = self.pipeline_run.failed_block_runs
                error_msg = 'Failed blocks: '\
                            f'{", ".join([b.block_uuid for b in failed_block_runs])}.'

                self.on_pipeline_run_failure(error_msg)
            elif PipelineType.INTEGRATION == self.pipeline.type:
                self.__schedule_integration_streams(block_runs)
            elif self.pipeline.run_pipeline_in_one_process:
                self.__schedule_pipeline()
            else:
                if not self.__check_block_run_timeout():
                    self.__schedule_blocks(block_runs)

    @safe_db_query
    def on_pipeline_run_failure(self, error: str) -> None:
        asyncio.run(UsageStatisticLogger().pipeline_run_ended(self.pipeline_run))
        self.notification_sender.send_pipeline_run_failure_message(
            pipeline=self.pipeline,
            pipeline_run=self.pipeline_run,
            error=error,
        )
        # Cancel block runs that are still in progress for the pipeline run.
        cancel_block_runs_and_jobs(self.pipeline_run, self.pipeline)

    @safe_db_query
    def on_block_complete(
        self,
        block_uuid: str,
        metrics: Dict = None,
    ) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)

        @retry(retries=2, delay=5)
        def update_status(metrics=metrics):
            metrics_prev = block_run.metrics or {}
            if metrics:
                metrics_prev.update(metrics)

            block_run.update(
                status=BlockRun.BlockRunStatus.COMPLETED,
                completed_at=datetime.now(tz=pytz.UTC),
                metrics=metrics_prev,
            )

        update_status()

        self.logger.info(
            f'BlockRun {block_run.id} (block_uuid: {block_uuid}) completes.',
            **self.build_tags(
                block_run_id=block_run.id,
                block_uuid=block_run.block_uuid,
            ),
        )

        self.pipeline_run.refresh()
        if self.pipeline_run.status != PipelineRun.PipelineRunStatus.RUNNING:
            return
        else:
            self.schedule()

    @safe_db_query
    def on_block_complete_without_schedule(
        self,
        block_uuid: str,
        metrics: Dict = None,
    ) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)

        @retry(retries=2, delay=5)
        def update_status(metrics=metrics):
            metrics_prev = block_run.metrics or {}
            if metrics:
                metrics_prev.update(metrics)

            block_run.update(
                status=BlockRun.BlockRunStatus.COMPLETED,
                completed_at=datetime.now(tz=pytz.UTC),
                metrics=metrics_prev,
            )

        update_status()

        self.logger.info(
            f'BlockRun {block_run.id} (block_uuid: {block_uuid}) completes.',
            **self.build_tags(
                block_run_id=block_run.id,
                block_uuid=block_run.block_uuid,
            ),
        )

    @safe_db_query
    def on_block_failure(self, block_uuid: str, **kwargs) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)
        metrics = block_run.metrics or {}

        @retry(retries=2, delay=5)
        def update_status():
            block_run.update(
                metrics=metrics,
                status=BlockRun.BlockRunStatus.FAILED,
            )

        error = kwargs.get('error', {})
        if error:
            metrics['error'] = dict(
                error=str(error.get('error')),
                errors=error.get('errors'),
                message=error.get('message')
            )

        update_status()

        tags = self.build_tags(
            block_run_id=block_run.id,
            block_uuid=block_run.block_uuid,
            error=error.get('error')
        )

        self.logger.exception(
            f'BlockRun {block_run.id} (block_uuid: {block_uuid}) failed.',
            **tags,
        )

        if not self.allow_blocks_to_fail:
            if PipelineType.INTEGRATION == self.pipeline.type:
                # If a block/stream fails, stop all other streams
                job_manager.kill_pipeline_run_job(self.pipeline_run.id)
                for stream in self.streams:
                    job_manager.kill_integration_stream_job(
                        self.pipeline_run.id,
                        stream.get('tap_stream_id')
                    )

                calculate_pipeline_run_metrics(
                    self.pipeline_run,
                    logger=self.logger,
                    logging_tags=tags,
                )

    def memory_usage_failure(self, tags: Dict = None) -> None:
        if tags is None:
            tags = dict()
        msg = 'Memory usage across all pipeline runs has reached or exceeded the maximum '\
            f'limit of {int(MEMORY_USAGE_MAXIMUM * 100)}%.'
        self.logger.info(msg, tags=tags)

        self.stop()

        self.notification_sender.send_pipeline_run_failure_message(
            pipeline=self.pipeline,
            pipeline_run=self.pipeline_run,
            summary=msg,
        )

        if PipelineType.INTEGRATION == self.pipeline.type:
            calculate_pipeline_run_metrics(
                self.pipeline_run,
                logger=self.logger,
                logging_tags=tags,
            )

    def build_tags(self, **kwargs):
        base_tags = dict(
            pipeline_run_id=self.pipeline_run.id,
            pipeline_schedule_id=self.pipeline_run.pipeline_schedule_id,
            pipeline_uuid=self.pipeline.uuid,
        )
        if HOSTNAME:
            base_tags['hostname'] = HOSTNAME
        return merge_dict(kwargs, base_tags)

    @safe_db_query
    def __check_pipeline_run_timeout(self) -> bool:
        """
        Check run timeout for pipeline run. The method checks if a pipeline run timeout is set
        and compares to the pipeline run time. If the run time is greater than the timeout,
        the run will be put into a failed state and the corresponding job is cancelled.

        Returns:
            bool: True if the pipeline run has timed out, False otherwise.
        """
        try:
            pipeline_run_timeout = self.pipeline_schedule.timeout

            if self.pipeline_run.started_at and pipeline_run_timeout:
                time_difference = datetime.now(tz=pytz.UTC).timestamp() - \
                    self.pipeline_run.started_at.timestamp()
                if time_difference > int(pipeline_run_timeout):
                    self.logger.error(
                        f'Pipeline run timed out after {int(time_difference)} seconds',
                        **self.build_tags(),
                    )
                    return True
        except Exception:
            pass

        return False

    @safe_db_query
    def __check_block_run_timeout(self) -> bool:
        """
        Check run timeout block runs. Currently only works for batch pipelines that are run
        using the `__schedule_blocks` method. This method checks if a block run has exceeded
        its timeout and puts the block run into a failed state and cancels the block run job.

        Returns:
            bool: True if any block runs have timed out, False otherwise.
        """
        block_runs = self.pipeline_run.running_block_runs

        any_block_run_timed_out = False
        for block_run in block_runs:
            try:
                block = self.pipeline.get_block(block_run.block_uuid)
                if block and block.timeout and block_run.started_at:
                    time_difference = datetime.now(tz=pytz.UTC).timestamp() - \
                        block_run.started_at.timestamp()
                    if time_difference > int(block.timeout):
                        # Get logger from block_executor so that the error log shows up in the
                        # block run log file and not the pipeline run log file.
                        block_executor = ExecutorFactory.get_block_executor(
                            self.pipeline,
                            block.uuid,
                            execution_partition=self.pipeline_run.execution_partition,
                        )
                        block_executor.logger.error(
                            f'Block {block_run.block_uuid} timed out after ' +
                            f'{int(time_difference)} seconds',
                            **block_executor.build_tags(
                                block_run_id=block_run.id,
                                pipeline_run_id=self.pipeline_run.id,
                            ),
                        )
                        self.on_block_failure(block_run.block_uuid)
                        job_manager.kill_block_run_job(block_run.id)
                        any_block_run_timed_out = True
            except Exception:
                pass
        return any_block_run_timed_out

    def __schedule_blocks(self, block_runs: List[BlockRun] = None) -> None:
        """Schedule the block runs for execution.

        This method schedules the block runs for execution by adding jobs to the job manager.
        It updates the statuses of the initial block runs and fetches any crashed block runs.
        The block runs to be scheduled are determined based on the provided block runs or the
        executable block runs of the pipeline run. The method adds jobs to the job manager for
        each block run, invoking the `run_block` function with the pipeline run ID, block run ID,
        variables, and tags as arguments.

        Args:
            block_runs (List[BlockRun], optional): A list of block runs. Defaults to None.

        Returns:
            None
        """
        self.pipeline_run.update_block_run_statuses(self.pipeline_run.initial_block_runs)
        if block_runs is None:
            block_runs_to_schedule = self.pipeline_run.executable_block_runs(
                allow_blocks_to_fail=self.allow_blocks_to_fail,
            )
        else:
            block_runs_to_schedule = block_runs
        block_runs_to_schedule = \
            self.__fetch_crashed_block_runs() + block_runs_to_schedule

        block_run_quota = len(block_runs_to_schedule)
        if self.concurrency_config.block_run_limit is not None:
            queued_or_running_block_runs = self.pipeline_run.queued_or_running_block_runs
            block_run_quota = self.concurrency_config.block_run_limit -\
                len(queued_or_running_block_runs)
            if block_run_quota <= 0:
                return

        for b in block_runs_to_schedule[:block_run_quota]:
            tags = dict(
                block_run_id=b.id,
                block_uuid=b.block_uuid,
            )

            b.update(
                status=BlockRun.BlockRunStatus.QUEUED,
            )

            job_manager.add_job(
                JobType.BLOCK_RUN,
                b.id,
                run_block,
                # args
                self.pipeline_run.id,
                b.id,
                self.pipeline_run.get_variables(),
                self.build_tags(**tags),
                None,
                None,
                None,
                None,
                None,
                None,
                None,
                [dict(
                    block_uuid=br.block_uuid,
                    id=br.id,
                    metrics=br.metrics,
                    status=br.status,
                ) for br in self.pipeline_run.block_runs],
            )

    def __schedule_integration_streams(self, block_runs: List[BlockRun] = None) -> None:
        """Schedule the integration streams for execution.

        This method schedules the integration streams for execution by adding jobs to the job
        manager. It determines the integration streams that need to be scheduled based on the
        provided block runs or the pipeline run's block runs. It filters the parallel and
        sequential streams to ensure only streams without corresponding integration stream jobs
        are scheduled. The method generates the necessary variables and runtime arguments for the
        pipeline execution. Jobs are added to the job manager to invoke the `run_integration_stream`
        function for parallel streams and the `run_integration_streams` function for sequential
        streams.

        Args:
            block_runs (List[BlockRun], optional): A list of block runs. Defaults to None.

        Returns:
            None
        """
        if block_runs is not None:
            block_runs_to_schedule = block_runs
        else:
            # Fetch all "in progress" blocks to handle crashed block runs
            block_runs_to_schedule = [
                b for b in self.pipeline_run.block_runs
                if b.status in [
                    BlockRun.BlockRunStatus.INITIAL,
                    BlockRun.BlockRunStatus.QUEUED,
                    BlockRun.BlockRunStatus.RUNNING,
                ]
            ]

        if len(block_runs_to_schedule) > 0:
            tags = self.build_tags()

            block_run_stream_ids = set()
            for br in block_runs_to_schedule:
                stream_id = br.block_uuid.split(':')[-2]
                if stream_id:
                    block_run_stream_ids.add(stream_id)

            filtered_streams = \
                [s for s in self.streams if s['tap_stream_id'] in block_run_stream_ids]
            parallel_streams = list(filter(lambda s: s.get('run_in_parallel'), filtered_streams))
            sequential_streams = list(filter(
                lambda s: not s.get('run_in_parallel'),
                filtered_streams,
            ))

            # Filter parallel streams so that we are only left with block runs for streams
            # that do not have a corresponding integration stream job.
            parallel_streams_to_schedule = []
            for stream in parallel_streams:
                tap_stream_id = stream.get('tap_stream_id')
                if not job_manager.has_integration_stream_job(self.pipeline_run.id, tap_stream_id):
                    parallel_streams_to_schedule.append(stream)

            # Stop scheduling if there are no streams to schedule.
            if (not sequential_streams or job_manager.has_pipeline_run_job(self.pipeline_run.id)) \
                    and len(parallel_streams_to_schedule) == 0:
                return

            # Generate global variables and runtime arguments for pipeline execution.
            variables = self.pipeline_run.get_variables(
                extra_variables=get_extra_variables(self.pipeline),
            )

            pipeline_schedule = self.pipeline_run.pipeline_schedule
            schedule_interval = pipeline_schedule.schedule_interval
            if ScheduleType.API == pipeline_schedule.schedule_type:
                execution_date = datetime.utcnow()
            else:
                # This will be none if trigger is API type
                execution_date = pipeline_schedule.current_execution_date()

            end_date = None
            start_date = None
            date_diff = None

            if ScheduleInterval.ONCE == schedule_interval:
                end_date = variables.get('_end_date')
                start_date = variables.get('_start_date')
            elif ScheduleInterval.HOURLY == schedule_interval:
                date_diff = timedelta(hours=1)
            elif ScheduleInterval.DAILY == schedule_interval:
                date_diff = timedelta(days=1)
            elif ScheduleInterval.WEEKLY == schedule_interval:
                date_diff = timedelta(weeks=1)
            elif ScheduleInterval.MONTHLY == schedule_interval:
                date_diff = relativedelta(months=1)

            if date_diff is not None:
                end_date = (execution_date).isoformat()
                start_date = (execution_date - date_diff).isoformat()

            runtime_arguments = dict(
                _end_date=end_date,
                _execution_date=execution_date.isoformat(),
                _execution_partition=self.pipeline_run.execution_partition,
                _start_date=start_date,
            )

            executable_block_runs = [b.id for b in block_runs_to_schedule]

            self.logger.info(
                f'Start executing PipelineRun {self.pipeline_run.id}: '
                f'pipeline {self.pipeline.uuid}',
                **tags,
            )

            for stream in parallel_streams_to_schedule:
                tap_stream_id = stream.get('tap_stream_id')
                job_manager.add_job(
                    JobType.INTEGRATION_STREAM,
                    f'{self.pipeline_run.id}_{tap_stream_id}',
                    run_integration_stream,
                    # args
                    stream,
                    set(executable_block_runs),
                    tags,
                    runtime_arguments,
                    self.pipeline_run.id,
                    variables,
                )

            if job_manager.has_pipeline_run_job(self.pipeline_run.id) or \
                    len(sequential_streams) == 0:
                return

            job_manager.add_job(
                JobType.PIPELINE_RUN,
                self.pipeline_run.id,
                run_integration_streams,
                # args
                sequential_streams,
                set(executable_block_runs),
                tags,
                runtime_arguments,
                self.pipeline_run.id,
                variables,
            )

    def __schedule_pipeline(self) -> None:
        """Schedule the pipeline run for execution.

        This method schedules the pipeline run for execution by adding a job to the job manager.
        If a job for the pipeline run already exists, the method returns without scheduling a new
        job. The job added to the job manager invokes the `run_pipeline` function with the
        pipeline run ID, variables, and tags as arguments.

        Returns:
            None
        """
        if job_manager.has_pipeline_run_job(self.pipeline_run.id):
            return
        self.logger.info(
            f'Start a process for PipelineRun {self.pipeline_run.id}',
            **self.build_tags(),
        )
        if PipelineType.STREAMING != self.pipeline.type:
            # Reset crashed block runs to INITIAL status
            self.__fetch_crashed_block_runs()
        job_manager.add_job(
            JobType.PIPELINE_RUN,
            self.pipeline_run.id,
            run_pipeline,
            # args
            self.pipeline_run.id,
            self.pipeline_run.get_variables(),
            self.build_tags(),
        )

    def __fetch_crashed_block_runs(self) -> None:
        """Fetch and handle crashed block runs.

        This method fetches the running or queued block runs of the pipeline run and checks if
        their corresponding job is still active. If a job is no longer active, the status of the
        block run is updated to 'INITIAL' to indicate that it needs to be re-executed. A list of
        crashed block runs is returned.

        Returns:
            List[BlockRun]: A list of crashed block runs.
        """
        running_or_queued_block_runs = [b for b in self.pipeline_run.block_runs if b.status in [
            BlockRun.BlockRunStatus.RUNNING,
            BlockRun.BlockRunStatus.QUEUED,
        ]]

        crashed_runs = []
        for br in running_or_queued_block_runs:
            if not job_manager.has_block_run_job(br.id):
                br.update(status=BlockRun.BlockRunStatus.INITIAL)
                crashed_runs.append(br)

        return crashed_runs

    def __run_heartbeat(self) -> None:
        load1, load5, load15, cpu_count = get_compute()
        cpu_usage = load15 / cpu_count if cpu_count else None

        free_memory, used_memory, total_memory = get_memory()
        memory_usage = used_memory / total_memory if total_memory else None

        tags = self.build_tags(
            cpu=load15,
            cpu_total=cpu_count,
            cpu_usage=cpu_usage,
            memory=used_memory,
            memory_total=total_memory,
            memory_usage=memory_usage,
        )

        self.logger.info(
            f'Pipeline {self.pipeline.uuid} for run {self.pipeline_run.id} '
            f'in schedule {self.pipeline_run.pipeline_schedule_id} is alive.',
            **tags,
        )

        if memory_usage and memory_usage >= MEMORY_USAGE_MAXIMUM:
            self.memory_usage_failure(tags)


def run_integration_streams(
    streams: List[Dict],
    *args,
):
    for stream in streams:
        run_integration_stream(stream, *args)


def run_integration_stream(
    stream: Dict,
    executable_block_runs: Set[int],
    tags: Dict,
    runtime_arguments: Dict,
    pipeline_run_id: int,
    variables: Dict,
):
    """Run an integration stream within the pipeline.

    This method executes an integration stream within the pipeline run. It iterates through each
    stream and executes the corresponding block runs in order. It handles the configuration
    and execution of the data loader, transformer blocks, and data exporter. Metrics calculation is
    performed for the stream if applicable.

    Args:
        stream (Dict): The configuration of the integration stream.
        executable_block_runs (Set[int]): A set of executable block run IDs.
        tags (Dict): A dictionary of tags for logging.
        runtime_arguments (Dict): A dictionary of runtime arguments.
        pipeline_run_id (int): The ID of the pipeline run.
        variables (Dict): A dictionary of variables.
    """
    pipeline_run = PipelineRun.query.get(pipeline_run_id)
    pipeline_scheduler = PipelineScheduler(pipeline_run)
    pipeline = pipeline_scheduler.pipeline
    data_loader_block = pipeline.data_loader
    data_exporter_block = pipeline.data_exporter

    tap_stream_id = stream['tap_stream_id']
    destination_table = stream.get('destination_table', tap_stream_id)

    # all_block_runs is a list of all block runs for the pipeline run
    all_block_runs = BlockRun.query.filter(BlockRun.pipeline_run_id == pipeline_run.id)
    # block_runs is a list of all executable blocks runs for the pipeline run
    block_runs = list(filter(lambda br: br.id in executable_block_runs, all_block_runs))

    # block_runs_for_stream is a list of block runs for the specified stream
    block_runs_for_stream = list(filter(lambda br: tap_stream_id in br.block_uuid, block_runs))
    if len(block_runs_for_stream) == 0:
        return

    indexes = [0]
    for br in block_runs_for_stream:
        parts = br.block_uuid.split(':')
        if len(parts) >= 3:
            indexes.append(int(parts[2]))
    max_index = max(indexes)

    all_block_runs_for_stream = list(filter(
        lambda br: tap_stream_id in br.block_uuid,
        all_block_runs,
    ))
    all_indexes = [0]
    for br in all_block_runs_for_stream:
        # Block run block uuid foramt: "{block_uuid}:{stream_name}:{index}"
        parts = br.block_uuid.split(':')
        if len(parts) >= 3:
            all_indexes.append(int(parts[2]))
    max_index_for_stream = max(all_indexes)

    # Streams can be split up into multiple parts if the source has a large amount of
    # data. Loop through each part of the stream, and execute the blocks runs.
    for idx in range(max_index + 1):
        block_runs_in_order = []
        current_block = data_loader_block

        while True:
            block_runs_in_order.append(
                find(
                    lambda b: b.block_uuid ==
                    f'{current_block.uuid}:{tap_stream_id}:{idx}',  # noqa: B023
                    all_block_runs,
                )
            )
            downstream_blocks = current_block.downstream_blocks
            if len(downstream_blocks) == 0:
                break
            current_block = downstream_blocks[0]

        data_loader_uuid = f'{data_loader_block.uuid}:{tap_stream_id}:{idx}'
        data_exporter_uuid = f'{data_exporter_block.uuid}:{tap_stream_id}:{idx}'

        data_loader_block_run = find(
            lambda b, u=data_loader_uuid: b.block_uuid == u,
            all_block_runs,
        )
        data_exporter_block_run = find(
            lambda b, u=data_exporter_uuid: b.block_uuid == u,
            block_runs_for_stream,
        )
        if not data_loader_block_run or not data_exporter_block_run:
            continue

        transformer_block_runs = [br for br in block_runs_in_order if (
            br.block_uuid not in [data_loader_uuid, data_exporter_uuid] and
            br.id in executable_block_runs
        )]

        index = stream.get('index', idx)

        # Create config for the block runs. This metadata will be passed into the
        # block before block execution.
        shared_dict = dict(
            destination_table=destination_table,
            index=index,
            is_last_block_run=(index == max_index_for_stream),
            selected_streams=[
                tap_stream_id,
            ],
        )
        block_runs_and_configs = [
            (data_loader_block_run, shared_dict),
        ] + [(br, shared_dict) for br in transformer_block_runs] + [
            (data_exporter_block_run, shared_dict),
        ]
        if len(executable_block_runs) == 1 and \
                data_exporter_block_run.id in executable_block_runs:
            block_runs_and_configs = block_runs_and_configs[-1:]
        elif data_loader_block_run.id not in executable_block_runs:
            block_runs_and_configs = block_runs_and_configs[1:]

        block_failed = False
        for _, tup in enumerate(block_runs_and_configs):
            block_run, template_runtime_configuration = tup

            tags_updated = merge_dict(tags, dict(
                block_run_id=block_run.id,
                block_uuid=block_run.block_uuid,
            ))

            if block_failed:
                block_run.update(
                    status=BlockRun.BlockRunStatus.UPSTREAM_FAILED,
                )
                continue

            pipeline_run.refresh()
            if pipeline_run.status != PipelineRun.PipelineRunStatus.RUNNING:
                return

            block_run.update(
                started_at=datetime.now(tz=pytz.UTC),
                status=BlockRun.BlockRunStatus.RUNNING,
            )
            pipeline_scheduler.logger.info(
                f'Start a process for BlockRun {block_run.id}',
                **tags_updated,
            )

            try:
                run_block(
                    pipeline_run_id,
                    block_run.id,
                    variables,
                    tags_updated,
                    pipeline_type=PipelineType.INTEGRATION,
                    verify_output=False,
                    # Not retry for data integration pipeline blocks
                    retry_config=dict(retries=0),
                    runtime_arguments=runtime_arguments,
                    schedule_after_complete=False,
                    template_runtime_configuration=template_runtime_configuration,
                )
            except Exception as e:
                if pipeline_scheduler.allow_blocks_to_fail:
                    block_failed = True
                else:
                    raise e
            else:
                tags2 = merge_dict(tags_updated.get('tags', {}), dict(
                    destination_table=destination_table,
                    index=index,
                    stream=tap_stream_id,
                ))
                if f'{data_loader_block.uuid}:{tap_stream_id}' in block_run.block_uuid:
                    calculate_source_metrics(
                        pipeline_run,
                        block_run,
                        stream=tap_stream_id,
                        logger=pipeline_scheduler.logger,
                        logging_tags=merge_dict(tags_updated, dict(tags=tags2)),
                    )
                elif f'{data_exporter_block.uuid}:{tap_stream_id}' in block_run.block_uuid:
                    calculate_destination_metrics(
                        pipeline_run,
                        block_run,
                        stream=tap_stream_id,
                        logger=pipeline_scheduler.logger,
                        logging_tags=merge_dict(tags_updated, dict(tags=tags2)),
                    )


def run_block(
    pipeline_run_id: int,
    block_run_id: int,
    variables: Dict,
    tags: Dict,
    input_from_output: Dict = None,
    pipeline_type: PipelineType = None,
    verify_output: bool = True,
    retry_config: Dict = None,
    runtime_arguments: Dict = None,
    schedule_after_complete: bool = False,
    template_runtime_configuration: Dict = None,
    block_run_dicts: List[Dict] = None,
) -> Any:
    """Execute a block within a pipeline run.
    Only run block that's with INITIAL or QUEUED status.

    Args:
        pipeline_run_id (int): The ID of the pipeline run.
        block_run_id (int): The ID of the block run.
        variables (Dict): A dictionary of variables.
        tags (Dict): A dictionary of tags for logging.
        input_from_output (Dict, optional): A dictionary mapping input names to output names.
        pipeline_type (PipelineType, optional): The type of pipeline.
        verify_output (bool, optional): Flag indicating whether to verify the output.
        retry_config (Dict, optional): A dictionary containing retry configuration.
        runtime_arguments (Dict, optional): A dictionary of runtime arguments. Used by data
            integration pipeline.
        schedule_after_complete (bool, optional): Flag indicating whether to schedule after
            completion.
        template_runtime_configuration (Dict, optional): A dictionary of template runtime
            configuration. Used by data integration pipeline.

    Returns:
        Any: The result of executing the block.
    """

    pipeline_run = PipelineRun.query.get(pipeline_run_id)
    if pipeline_run.status != PipelineRun.PipelineRunStatus.RUNNING:
        return {}

    block_run = BlockRun.query.get(block_run_id)
    if block_run.status not in [
        BlockRun.BlockRunStatus.INITIAL,
        BlockRun.BlockRunStatus.QUEUED,
        BlockRun.BlockRunStatus.RUNNING,
    ]:
        return {}

    block_run_data = dict(status=BlockRun.BlockRunStatus.RUNNING)
    if not block_run.started_at or (block_run.metrics and not block_run.metrics.get('controller')):
        block_run_data['started_at'] = datetime.now(tz=pytz.UTC)

    block_run.update(**block_run_data)

    pipeline_scheduler = PipelineScheduler(pipeline_run)
    pipeline_schedule = pipeline_run.pipeline_schedule
    pipeline = pipeline_scheduler.pipeline

    pipeline_scheduler.logger.info(
        f'Execute PipelineRun {pipeline_run.id}, BlockRun {block_run.id}: '
        f'pipeline {pipeline.uuid} block {block_run.block_uuid}',
        **tags)

    if schedule_after_complete:
        on_complete = pipeline_scheduler.on_block_complete
    else:
        on_complete = pipeline_scheduler.on_block_complete_without_schedule

    execution_partition = pipeline_run.execution_partition
    block_uuid = block_run.block_uuid
    block = pipeline.get_block(block_uuid)

    if block and retry_config is None:
        repo_path = None
        if project_platform_activated() and pipeline_schedule and pipeline_schedule.repo_path:
            repo_path = pipeline_schedule.repo_path
        else:
            repo_path = get_repo_path()

        retry_config = merge_dict(
            get_repo_config(repo_path).retry_config or dict(),
            block.retry_config or dict(),
        )

    return ExecutorFactory.get_block_executor(
        pipeline,
        block_uuid,
        block_run_id=block_run.id,
        execution_partition=execution_partition,
    ).execute(
        block_run_id=block_run.id,
        global_vars=variables,
        input_from_output=input_from_output,
        on_complete=on_complete,
        on_failure=pipeline_scheduler.on_block_failure,
        pipeline_run_id=pipeline_run_id,
        retry_config=retry_config,
        runtime_arguments=runtime_arguments,
        tags=tags,
        template_runtime_configuration=template_runtime_configuration,
        verify_output=verify_output,
        block_run_dicts=block_run_dicts,
    )


def run_pipeline(
    pipeline_run_id: int,
    variables: Dict,
    tags: Dict,
    allow_blocks_to_fail: bool = False,
):
    pipeline_run = PipelineRun.query.get(pipeline_run_id)
    pipeline_scheduler = PipelineScheduler(pipeline_run)
    pipeline = pipeline_scheduler.pipeline
    pipeline_scheduler.logger.info(f'Execute PipelineRun {pipeline_run.id}: '
                                   f'pipeline {pipeline.uuid}',
                                   **tags)
    executor_type = ExecutorFactory.get_pipeline_executor_type(pipeline)
    try:
        pipeline_run.update(executor_type=executor_type)
    except Exception:
        traceback.print_exc()
    ExecutorFactory.get_pipeline_executor(
        pipeline,
        execution_partition=pipeline_run.execution_partition,
        executor_type=executor_type,
    ).execute(
        allow_blocks_to_fail=allow_blocks_to_fail,
        global_vars=variables,
        pipeline_run_id=pipeline_run_id,
        tags=tags,
    )


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
def retry_pipeline_run(
    pipeline_run: Dict,
) -> 'PipelineRun':
    pipeline_uuid = pipeline_run['pipeline_uuid']
    pipeline = Pipeline.get(pipeline_uuid, check_if_exists=True)

    if pipeline is None or not pipeline.is_valid_pipeline(pipeline.dir_path):
        raise Exception(f'Pipeline {pipeline_uuid} is not a valid pipeline.')

    pipeline_schedule_id = pipeline_run['pipeline_schedule_id']
    pipeline_run_model = PipelineRun(
        id=pipeline_run['id'],
        pipeline_schedule_id=pipeline_schedule_id,
        pipeline_uuid=pipeline_uuid,
    )
    execution_date = datetime.fromisoformat(pipeline_run['execution_date'])
    new_pipeline_run = pipeline_run_model.create(
        backfill_id=pipeline_run.get('backfill_id'),
        create_block_runs=False,
        execution_date=execution_date,
        event_variables=pipeline_run.get('event_variables', {}),
        pipeline_schedule_id=pipeline_schedule_id,
        pipeline_uuid=pipeline_run_model.pipeline_uuid,
        variables=pipeline_run.get('variables', {}),
    )
    return new_pipeline_run


def stop_pipeline_run(
    pipeline_run: PipelineRun,
    pipeline: Pipeline = None,
    status: PipelineRun.PipelineRunStatus = PipelineRun.PipelineRunStatus.CANCELLED,
) -> None:
    """Stop a pipeline run.

    This function stops a pipeline run by cancelling the pipeline run and its
    associated block runs. If a pipeline object is provided, it also kills the jobs
    associated with the pipeline run and its integration streams if applicable.

    Args:
        pipeline_run (PipelineRun): The pipeline run to stop.
        pipeline (Pipeline, optional): The pipeline associated with the pipeline run.
            Defaults to None.

    Returns:
        None
    """
    if pipeline_run.status not in [PipelineRun.PipelineRunStatus.INITIAL,
                                   PipelineRun.PipelineRunStatus.RUNNING]:
        return

    # Update pipeline run status to cancelled
    pipeline_run.update(status=status)

    asyncio.run(UsageStatisticLogger().pipeline_run_ended(pipeline_run))

    # Cancel all the block runs
    cancel_block_runs_and_jobs(pipeline_run, pipeline)


def cancel_block_runs_and_jobs(
    pipeline_run: PipelineRun,
    pipeline: Pipeline = None,
) -> None:
    """Cancel in progress block runs and jobs for a pipeline run.

    This function cancels blocks runs for the pipeline run. If a pipeline object
    is provided, it also kills the jobs associated with the pipeline run and its
    integration streams if applicable.

    Args:
        pipeline_run (PipelineRun): The pipeline run to stop.
        pipeline (Pipeline, optional): The pipeline associated with the pipeline run.
            Defaults to None.

    Returns:
        None
    """
    block_runs_to_cancel = []
    running_blocks = []
    for b in pipeline_run.block_runs:
        if b.status in [
            BlockRun.BlockRunStatus.INITIAL,
            BlockRun.BlockRunStatus.QUEUED,
            BlockRun.BlockRunStatus.RUNNING,
        ]:
            block_runs_to_cancel.append(b)
        if b.status == BlockRun.BlockRunStatus.RUNNING:
            running_blocks.append(b)
    BlockRun.batch_update_status(
        [b.id for b in block_runs_to_cancel],
        BlockRun.BlockRunStatus.CANCELLED,
    )

    # Kill jobs for integration streams and pipeline run
    if pipeline and (
        pipeline.type in [PipelineType.INTEGRATION, PipelineType.STREAMING]
        or pipeline.run_pipeline_in_one_process
    ):
        job_manager.kill_pipeline_run_job(pipeline_run.id)
        if pipeline.type == PipelineType.INTEGRATION:
            for stream in pipeline.streams():
                job_manager.kill_integration_stream_job(
                    pipeline_run.id,
                    stream.get('tap_stream_id')
                )
        if pipeline_run.executor_type == ExecutorType.K8S:
            """
            TODO: Support running and cancelling pipeline runs in ECS and GCP_CLOUD_RUN executors
            """
            ExecutorFactory.get_pipeline_executor(
                pipeline,
                executor_type=pipeline_run.executor_type,
            ).cancel(pipeline_run_id=pipeline_run.id)
    else:
        for b in running_blocks:
            job_manager.kill_block_run_job(b.id)


def check_sla():
    repo_pipelines = set(Pipeline.get_all_pipelines_all_projects(
        get_repo_path(),
        disable_pipelines_folder_creation=True,
    ))
    pipeline_schedules_results = PipelineSchedule.active_schedules(pipeline_uuids=repo_pipelines)
    pipeline_schedules_mapping = index_by(lambda x: x.id, pipeline_schedules_results)

    pipeline_schedules = set([s.id for s in pipeline_schedules_results])

    pipeline_runs = PipelineRun.in_progress_runs(pipeline_schedules)

    if pipeline_runs:
        current_time = datetime.now(tz=pytz.UTC)

        # TODO: combine all SLA alerts in one notification
        for pipeline_run in pipeline_runs:
            pipeline_schedule = pipeline_schedules_mapping.get(pipeline_run.pipeline_schedule_id)
            if not pipeline_schedule:
                continue

            sla = pipeline_schedule.sla
            if not sla:
                continue
            start_date = \
                pipeline_run.execution_date \
                if pipeline_run.execution_date is not None \
                else pipeline_run.created_at
            if compare(start_date + timedelta(seconds=sla), current_time) == -1:
                # passed SLA for pipeline_run
                pipeline = Pipeline.get(pipeline_schedule.pipeline_uuid)
                notification_sender = NotificationSender(
                    NotificationConfig.load(
                        config=merge_dict(
                            pipeline.repo_config.notification_config,
                            pipeline.notification_config,
                        ),
                    ),
                )
                notification_sender.send_pipeline_run_sla_passed_message(
                    pipeline,
                    pipeline_run,
                )

                pipeline_run.update(passed_sla=True)


def schedule_all():
    """
    This method manages the scheduling and execution of pipeline runs based on specified
    concurrency and pipeline scheduling rules.

    1. Check whether any new pipeline runs need to be scheduled.
    2. Group active pipeline runs by pipeline.
    3. Run git sync if "sync_on_pipeline_run" is enabled.
    4. For each pipeline, check whether or not any pipeline runs need to be scheduled for
       the active pipeline schedules by performing the following steps:
        1. Loop over pipeline schedules and acquire locks.
        2. Determine whether to schedule pipeline runs based on pipeline schedule trigger interval.
        3. Enforce per trigger pipeline run limit and create or cancel pipeline runs.
        4. Start pipeline runs and handle per pipeline pipeline run limit.
    5. In active pipeline runs, check whether any block runs need to be scheduled.

    The current limit checks can potentially run into race conditions with api or event triggered
    schedules, so that needs to be addressed at some point.
    """
    db_connection.session.expire_all()

    repo_pipelines = set(Pipeline.get_all_pipelines_all_projects(
        get_repo_path(),
        disable_pipelines_folder_creation=True,
    ))

    # Sync schedules from yaml file to DB
    sync_schedules(list(repo_pipelines))

    active_pipeline_schedules = list(PipelineSchedule.active_schedules(
        pipeline_uuids=repo_pipelines,
    ))

    backfills = Backfill.filter(pipeline_schedule_ids=[ps.id for ps in active_pipeline_schedules])

    backfills_by_pipeline_schedule_id = index_by(
        lambda backfill: backfill.pipeline_schedule_id,
        backfills,
    )

    active_pipeline_schedule_ids_with_landing_time_enabled = set()
    for pipeline_schedule in active_pipeline_schedules:
        if pipeline_schedule.landing_time_enabled():
            active_pipeline_schedule_ids_with_landing_time_enabled.add(pipeline_schedule.id)

    previous_pipeline_run_by_pipeline_schedule_id = {}
    if len(active_pipeline_schedule_ids_with_landing_time_enabled) >= 1:
        row_number_column = (
                func.
                row_number().
                over(
                    order_by=desc(PipelineRun.execution_date),
                    partition_by=PipelineRun.pipeline_schedule_id,
                ).
                label('row_number')
        )

        query = PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id.in_(
                active_pipeline_schedule_ids_with_landing_time_enabled,
            ),
            PipelineRun.status == PipelineRun.PipelineRunStatus.COMPLETED,
        )
        query = query.add_columns(row_number_column)
        query = query.from_self().filter(row_number_column == 1)
        for tup in query.all():
            pr, _ = tup
            previous_pipeline_run_by_pipeline_schedule_id[pr.pipeline_schedule_id] = pr

    git_sync_result = None
    sync_config = get_sync_config()

    active_pipeline_uuids = list(set([s.pipeline_uuid for s in active_pipeline_schedules]))
    pipeline_runs_by_pipeline = PipelineRun.active_runs_for_pipelines_grouped(active_pipeline_uuids)

    pipeline_schedules_by_pipeline_by_repo_path = collections.defaultdict(list)
    for schedule in active_pipeline_schedules:
        repo_path = schedule.repo_path if schedule.repo_path else None

        if repo_path not in pipeline_schedules_by_pipeline_by_repo_path:
            pipeline_schedules_by_pipeline_by_repo_path[repo_path] = {}

        if schedule.pipeline_uuid not in pipeline_schedules_by_pipeline_by_repo_path[repo_path]:
            pipeline_schedules_by_pipeline_by_repo_path[repo_path][schedule.pipeline_uuid] = []

        pipeline_schedules_by_pipeline_by_repo_path[repo_path][schedule.pipeline_uuid].append(
            schedule,
        )

    """
    {
      "/home/src/repo/default_platform2/project1": "/home/src/repo/default_platform2/project1",
      "/home/src/repo/default_platform2/project2": "/home/src/repo/default_platform2/project2"
    }
    """
    pipeline_schedule_repo_paths_to_repo_path_mapping = \
        repo_path_from_database_query_to_project_repo_path('pipeline_schedules')

    # Iterate through pipeline schedules by pipeline to handle pipeline run limits for
    # each pipeline.
    """
    {
      '/home/src/repo/default_platform2/project1': {
        'test1': [
          <mage_ai.orchestration.db.models.schedules.PipelineSchedule object at 0xffff85a0ef80>,
        ],
      },
      '/home/src/repo/default_platform2/project2': {
        'test2_pipeline': [
          <mage_ai.orchestration.db.models.schedules.PipelineSchedule object at 0xffff85a0f190>,
        ],
      },
    }
    """
    for pair in pipeline_schedules_by_pipeline_by_repo_path.items():
        repo_path, pipeline_schedules_by_pipeline = pair
        for pipeline_uuid, active_pipeline_schedules in pipeline_schedules_by_pipeline.items():
            pipeline_runs_to_start = []
            pipeline_runs_excluded_by_limit = []
            for pipeline_schedule in active_pipeline_schedules:
                pipeline = get_pipeline_from_platform(
                    pipeline_uuid,
                    repo_path=pipeline_schedule.repo_path,
                    mapping=pipeline_schedule_repo_paths_to_repo_path_mapping,
                )

                concurrency_config = ConcurrencyConfig.load(config=pipeline.concurrency_config)

                lock_key = f'pipeline_schedule_{pipeline_schedule.id}'
                if not lock.try_acquire_lock(lock_key):
                    continue

                try:
                    previous_runtimes = []
                    if pipeline_schedule.id in \
                            active_pipeline_schedule_ids_with_landing_time_enabled:

                        previous_pipeline_run = previous_pipeline_run_by_pipeline_schedule_id.get(
                            pipeline_schedule.id,
                        )
                        if previous_pipeline_run:
                            previous_runtimes = pipeline_schedule.runtime_history(
                                pipeline_run=previous_pipeline_run,
                            )

                    # Decide whether to schedule any pipeline runs
                    should_schedule = pipeline_schedule.should_schedule(
                        previous_runtimes=previous_runtimes,
                        pipeline=pipeline,
                    )
                    initial_pipeline_runs = [
                        r for r in pipeline_schedule.pipeline_runs
                        if r.status == PipelineRun.PipelineRunStatus.INITIAL
                    ]

                    if not should_schedule and not initial_pipeline_runs:
                        lock.release_lock(lock_key)
                        continue

                    running_pipeline_runs = [
                        r for r in pipeline_schedule.pipeline_runs
                        if r.status == PipelineRun.PipelineRunStatus.RUNNING
                    ]

                    if should_schedule and \
                            pipeline_schedule.id not in backfills_by_pipeline_schedule_id:
                        # Perform git sync if "sync_on_pipeline_run" is enabled and no other git
                        # sync has been run for this scheduler loop.
                        if not git_sync_result and sync_config and sync_config.sync_on_pipeline_run:
                            git_sync_result = run_git_sync(lock=lock, sync_config=sync_config)

                        payload = dict(
                            execution_date=pipeline_schedule.current_execution_date(),
                            pipeline_schedule_id=pipeline_schedule.id,
                            pipeline_uuid=pipeline_uuid,
                            variables=pipeline_schedule.variables,
                        )

                        if len(previous_runtimes) >= 1:
                            payload['metrics'] = dict(previous_runtimes=previous_runtimes)

                        if (
                            pipeline_schedule.get_settings().skip_if_previous_running
                            and (initial_pipeline_runs or running_pipeline_runs)
                        ):
                            # Cancel the pipeline run if previous pipeline runs haven't completed
                            # and skip_if_previous_running is enabled
                            from mage_ai.orchestration.triggers.utils import (
                                create_and_cancel_pipeline_run,
                            )

                            pipeline_run = create_and_cancel_pipeline_run(
                                pipeline,
                                pipeline_schedule,
                                payload,
                                message='Pipeline run limit reached... skipping this run',
                            )
                        else:
                            payload['create_block_runs'] = False
                            pipeline_run = PipelineRun.create(prevent_duplicates=True, **payload)
                            if pipeline_run:
                                # Log Git sync status for new pipeline runs if a git sync result
                                # exists
                                if git_sync_result:
                                    pipeline_scheduler = PipelineScheduler(pipeline_run)
                                    log_git_sync(
                                        git_sync_result,
                                        pipeline_scheduler.logger,
                                        pipeline_scheduler.build_tags(),
                                    )
                                initial_pipeline_runs.append(pipeline_run)

                    # Enforce pipeline concurrency limit
                    pipeline_run_quota = None
                    if concurrency_config.pipeline_run_limit is not None:
                        pipeline_run_quota = concurrency_config.pipeline_run_limit - \
                            len(running_pipeline_runs)

                    if pipeline_run_quota is None:
                        pipeline_run_quota = len(initial_pipeline_runs)

                    if pipeline_run_quota > 0:
                        initial_pipeline_runs.sort(key=lambda x: x.execution_date)
                        pipeline_runs_to_start.extend(initial_pipeline_runs[:pipeline_run_quota])
                        pipeline_runs_excluded_by_limit.extend(
                            initial_pipeline_runs[pipeline_run_quota:]
                        )
                finally:
                    lock.release_lock(lock_key)

            pipeline_run_limit = concurrency_config.pipeline_run_limit_all_triggers
            if pipeline_run_limit is not None:
                pipeline_quota = pipeline_run_limit - len(
                    pipeline_runs_by_pipeline.get(pipeline_uuid, [])
                )
            else:
                pipeline_quota = None

            quota_filtered_runs = pipeline_runs_to_start
            if pipeline_quota is not None:
                pipeline_quota = pipeline_quota if pipeline_quota > 0 else 0
                pipeline_runs_to_start.sort(key=lambda x: x.execution_date)
                quota_filtered_runs = pipeline_runs_to_start[:pipeline_quota]
                pipeline_runs_excluded_by_limit.extend(
                    pipeline_runs_to_start[pipeline_quota:]
                )

            for r in quota_filtered_runs:
                try:
                    PipelineScheduler(r).start()
                except Exception:
                    logger.exception(f'Failed to start {r}')
                    traceback.print_exc()
                    r.update(status=PipelineRun.PipelineRunStatus.FAILED)
                    continue

            # If on_pipeline_run_limit_reached is set as SKIP, cancel the pipeline runs that
            # were not scheduled due to pipeline run limits.
            if concurrency_config.on_pipeline_run_limit_reached == OnLimitReached.SKIP:
                for r in pipeline_runs_excluded_by_limit:
                    pipeline_scheduler = PipelineScheduler(r)
                    pipeline_scheduler.logger.warning(
                        'Pipeline run limit reached... skipping this run',
                        **pipeline_scheduler.build_tags(),
                    )
                    r.update(status=PipelineRun.PipelineRunStatus.CANCELLED)

    # Schedule active pipeline runs
    active_pipeline_runs = PipelineRun.active_runs_for_pipelines(
        pipeline_uuids=repo_pipelines,
        include_block_runs=True,
    )
    logger.info(f'Active pipeline runs: {[p.id for p in active_pipeline_runs]}')

    for r in active_pipeline_runs:
        try:
            r.refresh()
            PipelineScheduler(r).schedule()
        except Exception:
            logger.exception(f'Failed to schedule {r}')
            traceback.print_exc()
            continue
    job_manager.clean_up_jobs()


def schedule_with_event(event: Dict = None):
    """
    This method manages the scheduling and execution of pipeline runs for event triggered
    schedules. The logic is relatively similar to the `schedule_all()` method.

    1. Evaluate event matchers and get active pipeline schedules for each matched event matcher.
    2. Group matched pipeline schedules by pipeline.
    3. Create a new pipeline run for each matched pipeline schedule.

    Args:
        event (Dict): the trigger event
    """
    if event is None:
        event = dict()
    logger.info(f'Schedule with event {event}')
    all_event_matchers = EventMatcher.active_event_matchers()

    matched_pipeline_schedules = []
    for e in all_event_matchers:
        if e.match(event):
            logger.info(f'Event matched with {e}')
            matched_pipeline_schedules.extend(e.active_pipeline_schedules())
        else:
            logger.info(f'Event not matched with {e}')

    if len(matched_pipeline_schedules) > 0:
        from mage_ai.orchestration.triggers.utils import create_and_start_pipeline_run
        for p in matched_pipeline_schedules:
            payload = dict(
                execution_date=datetime.now(tz=pytz.UTC),
                pipeline_schedule_id=p.id,
                pipeline_uuid=p.pipeline_uuid,
                variables=merge_dict(p.variables or dict(), dict(event=event)),
            )
            create_and_start_pipeline_run(
                p.pipeline,
                p,
                payload,
                should_schedule=False,
            )


def sync_schedules(pipeline_uuids: List[str]):
    trigger_configs = []

    # Sync schedule configs from triggers.yaml to DB
    for pipeline_uuid in pipeline_uuids:
        pipeline_triggers = get_triggers_by_pipeline(pipeline_uuid)
        logger.debug(f'Sync pipeline trigger configs for {pipeline_uuid}: {pipeline_triggers}.')
        for pipeline_trigger in pipeline_triggers:
            if pipeline_trigger.envs and get_env() not in pipeline_trigger.envs:
                continue

            trigger_configs.append(pipeline_trigger)

    PipelineSchedule.create_or_update_batch(trigger_configs)
