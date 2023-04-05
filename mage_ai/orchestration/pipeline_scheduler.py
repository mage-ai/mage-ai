from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from mage_ai.data_integrations.utils.scheduler import (
    clear_source_output_files,
    initialize_state_and_runs,
)
from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.block.utils import (
    create_block_runs_from_dynamic_block,
    is_dynamic_block,
)
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.repo_manager import get_repo_config, get_repo_path
from mage_ai.data_preparation.sync import GitConfig
from mage_ai.data_preparation.sync.git_sync import GitSync
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.orchestration.db import db_connection
from mage_ai.orchestration.db.models.schedules import (
    Backfill,
    BlockRun,
    EventMatcher,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.orchestration.job_manager import JobType, job_manager
from mage_ai.orchestration.metrics.pipeline_run import calculate_metrics
from mage_ai.orchestration.notification.config import NotificationConfig
from mage_ai.orchestration.notification.sender import NotificationSender
from mage_ai.orchestration.utils.resources import get_compute, get_memory
from mage_ai.shared.array import find
from mage_ai.shared.constants import ENV_PROD
from mage_ai.shared.dates import compare
from mage_ai.shared.hash import index_by, merge_dict
from mage_ai.shared.retry import retry
from typing import Any, Dict, List
import pytz
import traceback

MEMORY_USAGE_MAXIMUM = 0.95


class PipelineScheduler:
    def __init__(
        self,
        pipeline_run: PipelineRun,
    ) -> None:
        self.pipeline_run = pipeline_run
        self.pipeline_schedule = pipeline_run.pipeline_schedule
        self.pipeline = Pipeline.get(pipeline_run.pipeline_uuid)
        self.logger_manager = LoggerManagerFactory.get_logger_manager(
            pipeline_uuid=self.pipeline.uuid,
            partition=self.pipeline_run.execution_partition,
            repo_config=self.pipeline.repo_config,
        )
        self.logger = DictLogger(self.logger_manager.logger)
        self.notification_sender = NotificationSender(
            NotificationConfig.load(config=self.pipeline.repo_config.notification_config),
        )

        self.allow_blocks_to_fail = (
            self.pipeline_schedule.get_settings().allow_blocks_to_fail
            if self.pipeline_schedule else False
        )

    def start(self, should_schedule: bool = True) -> None:
        if get_preferences().sync_config:
            sync_config = GitConfig.load(config=get_preferences().sync_config)
            if sync_config.sync_on_pipeline_run:
                sync = GitSync(sync_config)
                sync.sync_data()

        if self.pipeline_run.status == PipelineRun.PipelineRunStatus.RUNNING:
            return
        self.pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        if should_schedule:
            self.schedule()

    def stop(self) -> None:
        stop_pipeline_run(
            self.pipeline_run,
            self.pipeline,
        )

    def schedule(self, block_runs: List[BlockRun] = None) -> None:
        self.__run_heartbeat()

        for b in self.pipeline_run.block_runs:
            b.refresh()

        if PipelineType.STREAMING == self.pipeline.type:
            self.__schedule_pipeline()
        else:
            if self.pipeline_run.all_blocks_completed(self.allow_blocks_to_fail):
                if PipelineType.INTEGRATION == self.pipeline.type:
                    tags = dict(
                        pipeline_run_id=self.pipeline_run.id,
                        pipeline_uuid=self.pipeline.uuid,
                    )
                    self.logger.info(
                        f'Calculate metrics for pipeline run {self.pipeline_run.id} started.',
                        **tags,
                    )
                    calculate_metrics(self.pipeline_run)
                    self.logger.info(
                        f'Calculate metrics for pipeline run {self.pipeline_run.id} completed.',
                        **merge_dict(tags, dict(metrics=self.pipeline_run.metrics)),
                    )

                if self.pipeline_run.any_blocks_failed():
                    self.pipeline_run.update(
                        status=PipelineRun.PipelineRunStatus.FAILED,
                        completed_at=datetime.now(),
                    )
                    self.notification_sender.send_pipeline_run_failure_message(
                        pipeline=self.pipeline,
                        pipeline_run=self.pipeline_run,
                    )
                else:
                    self.pipeline_run.update(
                        status=PipelineRun.PipelineRunStatus.COMPLETED,
                        completed_at=datetime.now(),
                    )
                    self.notification_sender.send_pipeline_run_success_message(
                        pipeline=self.pipeline,
                        pipeline_run=self.pipeline_run,
                    )

                self.logger_manager.output_logs_to_destination()

                schedule = PipelineSchedule.get(
                    self.pipeline_run.pipeline_schedule_id,
                )

                if schedule:
                    backfills = schedule.backfills
                    # When all pipeline runs that are associated with backfill is done
                    if len(backfills) >= 1:
                        backfill = backfills[0]
                        if all([PipelineRun.PipelineRunStatus.COMPLETED == pr.status
                                for pr in backfill.pipeline_runs]):
                            backfill.update(
                                completed_at=datetime.now(),
                                status=Backfill.Status.COMPLETED,
                            )
                            schedule.update(
                                status=PipelineSchedule.ScheduleStatus.INACTIVE,
                            )
                    # If running once, update the schedule to inactive when pipeline run is done
                    elif schedule.status == PipelineSchedule.ScheduleStatus.ACTIVE and \
                            schedule.schedule_type == PipelineSchedule.ScheduleType.TIME and \
                            schedule.schedule_interval == PipelineSchedule.ScheduleInterval.ONCE:

                        schedule.update(status=PipelineSchedule.ScheduleStatus.INACTIVE)
            elif PipelineType.INTEGRATION == self.pipeline.type:
                self.__schedule_integration_pipeline(block_runs)
            else:
                self.__schedule_blocks(block_runs)

    def on_block_complete(self, block_uuid: str) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)

        @retry(retries=3, delay=5)
        def update_status():
            block_run.update(
                status=BlockRun.BlockRunStatus.COMPLETED,
                completed_at=datetime.now(),
            )

        update_status()

        self.logger.info(
            f'BlockRun {block_run.id} (block_uuid: {block_uuid}) completes.',
            **self.__build_tags(
                block_run_id=block_run.id,
                block_uuid=block_run.block_uuid,
            ),
        )

        self.pipeline_run.refresh()
        if self.pipeline_run.status != PipelineRun.PipelineRunStatus.RUNNING:
            return
        else:
            self.schedule()

    def on_block_complete_without_schedule(self, block_uuid: str) -> None:
        block = self.pipeline.get_block(block_uuid)
        if block and is_dynamic_block(block):
            create_block_runs_from_dynamic_block(block, self.pipeline_run, block_uuid=block_uuid)

        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)

        @retry(retries=3, delay=5)
        def update_status():
            block_run.update(
                status=BlockRun.BlockRunStatus.COMPLETED,
                completed_at=datetime.now(),
            )

        update_status()

        self.logger.info(
            f'BlockRun {block_run.id} (block_uuid: {block_uuid}) completes.',
            **self.__build_tags(
                block_run_id=block_run.id,
                block_uuid=block_run.block_uuid,
            ),
        )

    def on_block_failure(self, block_uuid: str, **kwargs) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)
        metrics = block_run.metrics or {}

        @retry(retries=3, delay=5)
        def update_status():
            block_run.update(
                metrics=metrics,
                status=BlockRun.BlockRunStatus.FAILED,
            )
            if not self.allow_blocks_to_fail:
                self.pipeline_run.update(
                    status=PipelineRun.PipelineRunStatus.FAILED)

        update_status()

        if 'error' in kwargs:
            metrics['error'] = kwargs['error']

        tags = self.__build_tags(
            block_run_id=block_run.id,
            block_uuid=block_run.block_uuid,
        )

        self.logger.info(
            f'BlockRun {block_run.id} (block_uuid: {block_uuid}) failed.',
            **tags,
        )

        if not self.allow_blocks_to_fail:
            self.notification_sender.send_pipeline_run_failure_message(
                pipeline=self.pipeline,
                pipeline_run=self.pipeline_run,
            )

            if PipelineType.INTEGRATION == self.pipeline.type:
                # If a block/stream fails, stop all other streams
                job_manager.kill_pipeline_run_job(self.pipeline_run.id)

                self.logger.info(
                    f'Calculate metrics for pipeline run {self.pipeline_run.id} error started.',
                    tags=tags,
                )
                calculate_metrics(self.pipeline_run)
                self.logger.info(
                    f'Calculate metrics for pipeline run {self.pipeline_run.id} error completed.',
                    tags=merge_dict(tags, dict(metrics=self.pipeline_run.metrics)),
                )

    def memory_usage_failure(self, tags: Dict = {}) -> None:
        msg = 'Memory usage across all pipeline runs has reached or exceeded the maximum '\
            f'limit of {int(MEMORY_USAGE_MAXIMUM * 100)}%.'
        self.logger.info(msg, tags=tags)

        self.stop()

        self.notification_sender.send_pipeline_run_failure_message(
            pipeline=self.pipeline,
            pipeline_run=self.pipeline_run,
            message=msg,
        )

        if PipelineType.INTEGRATION == self.pipeline.type:
            self.logger.info(
                f'Calculate metrics for pipeline run {self.pipeline_run.id} error started.',
                tags=tags,
            )
            calculate_metrics(self.pipeline_run)
            self.logger.info(
                f'Calculate metrics for pipeline run {self.pipeline_run.id} error completed.',
                tags=merge_dict(tags, dict(metrics=self.pipeline_run.metrics)),
            )

    @property
    def initial_block_runs(self) -> List[BlockRun]:
        return [b for b in self.pipeline_run.block_runs
                if b.status == BlockRun.BlockRunStatus.INITIAL]

    @property
    def completed_block_runs(self) -> List[BlockRun]:
        return [b for b in self.pipeline_run.block_runs
                if b.status == BlockRun.BlockRunStatus.COMPLETED]

    @property
    def failed_block_runs(self) -> List[BlockRun]:
        return [b for b in self.pipeline_run.block_runs
                if b.status == BlockRun.BlockRunStatus.FAILED]

    @property
    def executable_block_runs(self) -> List[BlockRun]:
        completed_block_uuids = set(b.block_uuid for b in self.completed_block_runs)
        finished_block_uuids = set(
            b.block_uuid for b in self.pipeline_run.block_runs
            if b.status in [
                BlockRun.BlockRunStatus.COMPLETED,
                BlockRun.BlockRunStatus.UPSTREAM_FAILED,
                BlockRun.BlockRunStatus.FAILED,
            ]
        )

        executable_block_runs = list()
        for block_run in self.initial_block_runs:
            completed = False

            dynamic_upstream_block_uuids = block_run.metrics and block_run.metrics.get(
                'dynamic_upstream_block_uuids',
            )

            if dynamic_upstream_block_uuids:
                if self.allow_blocks_to_fail:
                    completed = all(uuid in finished_block_uuids
                                    for uuid in dynamic_upstream_block_uuids)
                else:
                    completed = all(uuid in completed_block_uuids
                                    for uuid in dynamic_upstream_block_uuids)
            else:
                block = self.pipeline.get_block(block_run.block_uuid)
                completed = block is not None and \
                    block.all_upstream_blocks_completed(completed_block_uuids)

            if completed:
                executable_block_runs.append(block_run)

        return executable_block_runs

    def __update_block_run_statuses(self, block_runs: List[BlockRun]) -> None:
        failed_block_uuids = set(
            b.block_uuid for b in self.pipeline_run.block_runs
            if b.status in [
                BlockRun.BlockRunStatus.UPSTREAM_FAILED,
                BlockRun.BlockRunStatus.FAILED,
            ]
        )
        not_updated_block_runs = []
        for block_run in block_runs:
            updated_status = False
            dynamic_upstream_block_uuids = block_run.metrics and block_run.metrics.get(
                'dynamic_upstream_block_uuids',
            )

            if dynamic_upstream_block_uuids:
                if all(
                    b in failed_block_uuids
                    for b in dynamic_upstream_block_uuids
                ):
                    block_run.update(
                        status=BlockRun.BlockRunStatus.UPSTREAM_FAILED)
                    updated_status = True
            else:
                block = self.pipeline.get_block(block_run.block_uuid)
                if any(
                    b in failed_block_uuids
                    for b in block.upstream_block_uuids
                ):
                    block_run.update(
                        status=BlockRun.BlockRunStatus.UPSTREAM_FAILED)
                    updated_status = True

            if not updated_status:
                not_updated_block_runs.append(block_run)

        self.pipeline_run.refresh()
        # keep iterating through block runs until no more updates can be made
        if len(block_runs) != len(not_updated_block_runs):
            self.__update_block_run_statuses(not_updated_block_runs)

    def __schedule_blocks(self, block_runs: List[BlockRun] = None) -> None:
        self.__update_block_run_statuses(self.initial_block_runs)
        block_runs_to_schedule = \
            self.executable_block_runs if block_runs is None else block_runs
        block_runs_to_schedule = \
            self.__fetch_crashed_block_runs() + block_runs_to_schedule

        for b in block_runs_to_schedule:
            tags = dict(
                block_run_id=b.id,
                block_uuid=b.block_uuid,
            )

            b.update(
                started_at=datetime.now(),
                status=BlockRun.BlockRunStatus.QUEUED,
            )

            job_manager.add_job(
                JobType.BLOCK_RUN,
                b.id,
                run_block,
                # args
                self.pipeline_run.id,
                b.id,
                get_variables(self.pipeline_run),
                self.__build_tags(**tags),
            )

    def __schedule_integration_pipeline(self, block_runs: List[BlockRun] = None) -> None:
        if job_manager.has_pipeline_run_job(self.pipeline_run.id):
            return

        block_runs_to_schedule = self.initial_block_runs if block_runs is None else block_runs
        block_runs_to_schedule = self.__fetch_crashed_block_runs() + block_runs_to_schedule

        if len(block_runs_to_schedule) > 0:
            self.logger.info(
                f'Start a process for PipelineRun {self.pipeline_run.id}',
                **self.__build_tags(),
            )

            job_manager.add_job(
                JobType.PIPELINE_RUN,
                self.pipeline_run.id,
                run_integration_pipeline,
                # args
                self.pipeline_run.id,
                [b.id for b in block_runs_to_schedule],
                get_variables(self.pipeline_run, dict(
                    pipeline_uuid=self.pipeline.uuid,
                )),
                self.__build_tags(),
            )

    def __schedule_pipeline(self) -> None:
        if job_manager.has_pipeline_run_job(self.pipeline_run.id):
            return
        self.logger.info(
            f'Start a process for PipelineRun {self.pipeline_run.id}',
            **self.__build_tags(),
        )
        job_manager.add_job(
            JobType.PIPELINE_RUN,
            self.pipeline_run.id,
            run_pipeline,
            # args
            self.pipeline_run.id,
            get_variables(self.pipeline_run),
            self.__build_tags(),
        )

    def __fetch_crashed_block_runs(self) -> None:
        running_block_runs = [b for b in self.pipeline_run.block_runs if b.status in [
            BlockRun.BlockRunStatus.RUNNING,
        ]]

        crashed_runs = []
        for br in running_block_runs:
            if not job_manager.has_block_run_job(br.id):
                br.update(status=BlockRun.BlockRunStatus.INITIAL)
                crashed_runs.append(br)

        return crashed_runs

    def __build_tags(self, **kwargs):
        return merge_dict(kwargs, dict(
            pipeline_run_id=self.pipeline_run.id,
            pipeline_schedule_id=self.pipeline_run.pipeline_schedule_id,
            pipeline_uuid=self.pipeline.uuid,
        ))

    def __run_heartbeat(self) -> None:
        load1, load5, load15, cpu_count = get_compute()
        cpu_usage = load15 / cpu_count if cpu_count else None

        free_memory, used_memory, total_memory = get_memory()
        memory_usage = used_memory / total_memory if total_memory else None

        tags = dict(
            cpu=load15,
            cpu_total=cpu_count,
            cpu_usage=cpu_usage,
            memory=used_memory,
            memory_total=total_memory,
            memory_usage=memory_usage,
            pipeline_run_id=self.pipeline_run.id,
            pipeline_uuid=self.pipeline.uuid,
        )

        self.logger.info(
            f'Pipeline {self.pipeline.uuid} for run {self.pipeline_run.id} '
            f'in schedule {self.pipeline_run.pipeline_schedule_id} is alive.',
            **tags,
        )

        if memory_usage and memory_usage >= MEMORY_USAGE_MAXIMUM:
            self.memory_usage_failure(tags)


def run_integration_pipeline(
    pipeline_run_id: int,
    executable_block_runs: List[int],
    variables: Dict,
    tags: Dict,
) -> None:
    pipeline_run = PipelineRun.query.get(pipeline_run_id)
    pipeline_scheduler = PipelineScheduler(pipeline_run)
    integration_pipeline = IntegrationPipeline.get(pipeline_scheduler.pipeline.uuid)
    pipeline_scheduler.logger.info(f'Execute PipelineRun {pipeline_run.id}: '
                                   f'pipeline {integration_pipeline.uuid}',
                                   **tags)

    pipeline_scheduler.logger.info(f'Executable block runs: {executable_block_runs}',
                                   **tags)

    all_block_runs = BlockRun.query.filter(BlockRun.pipeline_run_id == pipeline_run_id)
    block_runs = list(filter(lambda br: br.id in executable_block_runs, all_block_runs))

    pipeline_schedule = pipeline_run.pipeline_schedule
    schedule_interval = pipeline_schedule.schedule_interval
    execution_date = pipeline_schedule.current_execution_date()

    end_date = None
    start_date = None
    date_diff = None

    if PipelineSchedule.ScheduleInterval.ONCE == schedule_interval:
        end_date = variables.get('_end_date')
        start_date = variables.get('_start_date')
    elif PipelineSchedule.ScheduleInterval.HOURLY == schedule_interval:
        date_diff = timedelta(hours=1)
    elif PipelineSchedule.ScheduleInterval.DAILY == schedule_interval:
        date_diff = timedelta(days=1)
    elif PipelineSchedule.ScheduleInterval.WEEKLY == schedule_interval:
        date_diff = timedelta(weeks=1)
    elif PipelineSchedule.ScheduleInterval.MONTHLY == schedule_interval:
        date_diff = relativedelta(months=1)

    if date_diff is not None:
        end_date = (execution_date).isoformat()
        start_date = (execution_date - date_diff).isoformat()

    runtime_arguments = dict(
        _end_date=end_date,
        _execution_date=execution_date.isoformat(),
        _execution_partition=pipeline_run.execution_partition,
        _start_date=start_date,
    )

    data_loader_block = integration_pipeline.data_loader
    data_exporter_block = integration_pipeline.data_exporter

    for stream in integration_pipeline.streams(variables):
        tap_stream_id = stream['tap_stream_id']
        destination_table = stream.get('destination_table', tap_stream_id)

        block_runs_for_stream = list(filter(lambda br: tap_stream_id in br.block_uuid, block_runs))
        if len(block_runs_for_stream) == 0:
            continue

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
            parts = br.block_uuid.split(':')
            if len(parts) >= 3:
                all_indexes.append(int(parts[2]))
        max_index_for_stream = max(all_indexes)

        for idx in range(max_index + 1):
            block_runs_in_order = []
            current_block = data_loader_block

            while True:
                block_runs_in_order.append(
                    find(
                        lambda b: b.block_uuid == f'{current_block.uuid}:{tap_stream_id}:{idx}',
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
                lambda b: b.block_uuid == data_loader_uuid,
                all_block_runs,
            )
            data_exporter_block_run = find(
                lambda b: b.block_uuid == data_exporter_uuid,
                block_runs_for_stream,
            )
            if not data_loader_block_run or not data_exporter_block_run:
                continue

            transformer_block_runs = [br for br in block_runs_in_order if br.block_uuid not in [
                data_loader_uuid,
                data_exporter_uuid,
            ]]

            index = stream.get('index', idx)

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

            block_failed = False
            for idx2, tup in enumerate(block_runs_and_configs):
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
                    started_at=datetime.now(),
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
                    if f'{data_loader_block.uuid}:{tap_stream_id}' in block_run.block_uuid or \
                            f'{data_exporter_block.uuid}:{tap_stream_id}' in block_run.block_uuid:

                        tags2 = merge_dict(tags_updated.get('tags', {}), dict(
                            destination_table=destination_table,
                            index=index,
                            stream=tap_stream_id,
                        ))
                        pipeline_scheduler.logger.info(
                            f'Calculate metrics for pipeline run {pipeline_run.id} started.',
                            **tags_updated,
                            tags=tags2,
                        )
                        try:
                            calculate_metrics(pipeline_run)
                            pipeline_scheduler.logger.info(
                                f'Calculate metrics for pipeline run {pipeline_run.id} completed.',
                                **tags_updated,
                                tags=merge_dict(tags2, dict(metrics=pipeline_run.metrics)),
                            )
                        except Exception:
                            pipeline_scheduler.logger.error(
                                f'Failed to calculate metrics for pipeline run {pipeline_run.id}. '
                                f'{traceback.format_exc()}',
                                **tags_updated,
                                tags=tags2,
                            )


def run_block(
    pipeline_run_id,
    block_run_id,
    variables,
    tags,
    input_from_output: Dict = None,
    pipeline_type: PipelineType = None,
    verify_output: bool = True,
    runtime_arguments: Dict = None,
    schedule_after_complete: bool = False,
    template_runtime_configuration: Dict = None,
) -> Any:
    pipeline_run = PipelineRun.query.get(pipeline_run_id)
    if pipeline_run.status != PipelineRun.PipelineRunStatus.RUNNING:
        return {}

    pipeline_scheduler = PipelineScheduler(pipeline_run)

    pipeline = pipeline_scheduler.pipeline

    block_run = BlockRun.query.get(block_run_id)
    block_run.update(
        started_at=datetime.now(),
        status=BlockRun.BlockRunStatus.RUNNING,
    )

    pipeline_scheduler.logger.info(
        f'Execute PipelineRun {pipeline_run.id}, BlockRun {block_run.id}: '
        f'pipeline {pipeline.uuid} block {block_run.block_uuid}',
        **tags)

    if schedule_after_complete:
        on_complete = pipeline_scheduler.on_block_complete
    else:
        on_complete = pipeline_scheduler.on_block_complete_without_schedule

    block_run_data = block_run.metrics or {}
    dynamic_block_index = block_run_data.get('dynamic_block_index', None)
    dynamic_upstream_block_uuids = block_run_data.get('dynamic_upstream_block_uuids', None)

    return ExecutorFactory.get_block_executor(
        pipeline,
        block_run.block_uuid,
        execution_partition=pipeline_run.execution_partition,
    ).execute(
        analyze_outputs=False,
        block_run_id=block_run.id,
        global_vars=variables,
        update_status=False,
        on_complete=on_complete,
        on_failure=pipeline_scheduler.on_block_failure,
        tags=tags,
        input_from_output=input_from_output,
        verify_output=verify_output,
        pipeline_run_id=pipeline_run_id,
        runtime_arguments=runtime_arguments,
        template_runtime_configuration=template_runtime_configuration,
        dynamic_block_index=dynamic_block_index,
        dynamic_block_uuid=None if dynamic_block_index is None else block_run.block_uuid,
        dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
    )


def run_pipeline(pipeline_run_id, variables, tags):
    pipeline_run = PipelineRun.query.get(pipeline_run_id)
    pipeline_scheduler = PipelineScheduler(pipeline_run)
    pipeline = pipeline_scheduler.pipeline
    pipeline_scheduler.logger.info(f'Execute PipelineRun {pipeline_run.id}: '
                                   f'pipeline {pipeline.uuid}',
                                   **tags)

    ExecutorFactory.get_pipeline_executor(
        pipeline,
        execution_partition=pipeline_run.execution_partition,
    ).execute(
        global_vars=variables,
        tags=tags,
    )


def stop_pipeline_run(
    pipeline_run: PipelineRun,
    pipeline: Pipeline = None,
) -> None:
    if pipeline_run.status not in [PipelineRun.PipelineRunStatus.INITIAL,
                                   PipelineRun.PipelineRunStatus.RUNNING]:
        return

    pipeline_run.update(status=PipelineRun.PipelineRunStatus.CANCELLED)

    # Cancel all the block runs
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

    if pipeline and pipeline.type in [PipelineType.INTEGRATION, PipelineType.STREAMING]:
        job_manager.kill_pipeline_run_job(pipeline_run.id)
    else:
        for b in running_blocks:
            job_manager.kill_block_run_job(b.id)


def check_sla():
    repo_pipelines = set(Pipeline.get_all_pipelines(get_repo_path()))
    pipeline_schedules = \
        set([
            s.id
            for s in PipelineSchedule.active_schedules(pipeline_uuids=repo_pipelines)
        ])

    pipeline_runs = PipelineRun.in_progress_runs(pipeline_schedules)

    if pipeline_runs:
        notification_sender = NotificationSender(
             NotificationConfig.load(config=get_repo_config(get_repo_path()).notification_config),
        )

        current_time = datetime.now(tz=pytz.UTC)
        # TODO: combine all SLA alerts in one notification
        for pipeline_run in pipeline_runs:
            sla = pipeline_run.pipeline_schedule.sla
            if not sla:
                continue
            start_date = \
                pipeline_run.execution_date \
                if pipeline_run.execution_date is not None \
                else pipeline_run.created_at
            if compare(start_date, current_time - timedelta(seconds=sla)) == 1:
                # passed SLA for pipeline_run
                notification_sender.send_pipeline_run_sla_passed_message(
                    Pipeline.get(pipeline_run.pipeline_schedule.pipeline_uuid),
                    pipeline_run,
                )

                pipeline_run.update(passed_sla=True)


def schedule_all():
    """
    1. Check whether any new pipeline runs need to be scheduled.
    2. In active pipeline runs, check whether any block runs need to be scheduled.
    """
    db_connection.session.expire_all()

    repo_pipelines = set(Pipeline.get_all_pipelines(get_repo_path()))

    active_pipeline_schedules = \
        list(PipelineSchedule.active_schedules(pipeline_uuids=repo_pipelines))

    backfills = Backfill.filter(pipeline_schedule_ids=[ps.id for ps in active_pipeline_schedules])

    backfills_by_pipeline_schedule_id = index_by(
        lambda backfill: backfill.pipeline_schedule_id,
        backfills,
    )

    for pipeline_schedule in active_pipeline_schedules:
        if pipeline_schedule.should_schedule() and \
                pipeline_schedule.id not in backfills_by_pipeline_schedule_id:

            pipeline_uuid = pipeline_schedule.pipeline_uuid
            payload = dict(
                execution_date=pipeline_schedule.current_execution_date(),
                pipeline_schedule_id=pipeline_schedule.id,
                pipeline_uuid=pipeline_uuid,
                variables=pipeline_schedule.variables,
            )

            pipeline = Pipeline.get(pipeline_uuid)
            is_integration = PipelineType.INTEGRATION == pipeline.type
            if is_integration:
                payload['create_block_runs'] = False

            running_pipeline_run = find(
                lambda r: r.status in [
                    PipelineRun.PipelineRunStatus.INITIAL,
                    PipelineRun.PipelineRunStatus.RUNNING,
                ],
                pipeline_schedule.pipeline_runs
            )
            if pipeline_schedule.get_settings().skip_if_previous_running and \
                    running_pipeline_run is not None:

                payload['create_block_runs'] = False
                pipeline_run = PipelineRun.create(**payload)
                pipeline_run.update(status=PipelineRun.PipelineRunStatus.CANCELLED)
            else:
                pipeline_run = PipelineRun.create(**payload)
                pipeline_scheduler = PipelineScheduler(pipeline_run)
                if is_integration:
                    block_runs = BlockRun.query.filter(
                        BlockRun.pipeline_run_id == pipeline_run.id).all()
                    if len(block_runs) == 0:
                        clear_source_output_files(
                            pipeline_run,
                            pipeline_scheduler.logger,
                        )
                        initialize_state_and_runs(
                            pipeline_run,
                            pipeline_scheduler.logger,
                            get_variables(pipeline_run),
                        )

                pipeline_scheduler.start(should_schedule=False)

    active_pipeline_runs = PipelineRun.active_runs(
        pipeline_uuids=repo_pipelines,
        include_block_runs=True,
    )
    print(f'Active pipeline runs: {[p.id for p in active_pipeline_runs]}')

    for r in active_pipeline_runs:
        try:
            r.refresh()
            PipelineScheduler(r).schedule()
        except Exception:
            print(f'Failed to schedule {r}')
            traceback.print_exc()
            continue
    job_manager.clean_up_jobs()


def schedule_with_event(event: Dict = dict()):
    print(f'Schedule with event {event}')
    all_event_matchers = EventMatcher.active_event_matchers()
    for e in all_event_matchers:
        if e.match(event):
            print(f'Event matched with {e}')
            pipeline_schedules = e.active_pipeline_schedules()
            for p in pipeline_schedules:
                payload = dict(
                    execution_date=datetime.now(),
                    pipeline_schedule_id=p.id,
                    pipeline_uuid=p.pipeline_uuid,
                    variables=merge_dict(p.variables or dict(), dict(event=event)),
                )
                pipeline_run = PipelineRun.create(**payload)
                PipelineScheduler(pipeline_run).start(should_schedule=True)
        else:
            print(f'Event not matched with {e}')


def get_variables(pipeline_run, extra_variables: Dict = {}) -> Dict:
    if not pipeline_run:
        return {}

    pipeline_run_variables = pipeline_run.variables or {}
    event_variables = pipeline_run.event_variables or {}

    variables = merge_dict(
        merge_dict(
            get_global_variables(pipeline_run.pipeline_uuid) or dict(),
            pipeline_run.pipeline_schedule.variables or dict(),
        ),
        pipeline_run_variables,
    )

    # For backwards compatibility
    for k, v in event_variables.items():
        if k not in variables:
            variables[k] = v

    if pipeline_run.execution_date:
        variables['ds'] = pipeline_run.execution_date.strftime('%Y-%m-%d')
        variables['hr'] = pipeline_run.execution_date.strftime('%H')

    variables['env'] = ENV_PROD
    variables['event'] = merge_dict(variables.get('event', {}), event_variables)
    variables['execution_date'] = pipeline_run.execution_date
    variables['execution_partition'] = pipeline_run.execution_partition
    variables.update(extra_variables)

    return variables
