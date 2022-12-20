from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from mage_ai.data_integrations.utils.scheduler import initialize_state_and_runs
from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.logging.logger_manager_factory import LoggerManagerFactory
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.pipelines.integration_pipeline import IntegrationPipeline
from mage_ai.data_preparation.repo_manager import get_repo_config, get_repo_path
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.orchestration.db.constants import IN_PROGRESS_STATUSES
from mage_ai.orchestration.db.models import BlockRun, EventMatcher, PipelineRun, PipelineSchedule
from mage_ai.orchestration.db.process import create_process
from mage_ai.orchestration.execution_process_manager import execution_process_manager
from mage_ai.orchestration.metrics.pipeline_run import calculate_metrics
from mage_ai.orchestration.notification.config import NotificationConfig
from mage_ai.orchestration.notification.sender import NotificationSender
from mage_ai.shared.array import find
from mage_ai.shared.constants import ENV_PROD
from mage_ai.shared.dates import compare
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.retry import retry
from typing import Any, Dict, List
import pytz
import traceback


class PipelineScheduler:
    def __init__(
        self,
        pipeline_run: PipelineRun,
    ) -> None:
        self.pipeline_run = pipeline_run
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

    def start(self, should_schedule: bool = True) -> None:
        if self.pipeline_run.status == PipelineRun.PipelineRunStatus.RUNNING:
            return
        self.pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        if should_schedule:
            self.schedule()

    def stop(self) -> None:
        if self.pipeline_run.status not in [PipelineRun.PipelineRunStatus.INITIAL,
                                            PipelineRun.PipelineRunStatus.RUNNING]:
            return

        self.pipeline_run.update(status=PipelineRun.PipelineRunStatus.CANCELLED)

        # Cancel all the block runs
        for b in self.pipeline_run.block_runs:
            if b.status in [
                BlockRun.BlockRunStatus.INITIAL,
                BlockRun.BlockRunStatus.QUEUED,
                BlockRun.BlockRunStatus.RUNNING,
            ]:
                b.update(status=BlockRun.BlockRunStatus.CANCELLED)

        if PipelineType.INTEGRATION == self.pipeline.type:
            execution_process_manager.terminate_pipeline_process(self.pipeline_run.id)

    def schedule(self, block_runs: List[BlockRun] = None) -> None:
        if PipelineType.STREAMING == self.pipeline.type:
            self.__schedule_pipeline()
        else:
            if self.pipeline_run.all_blocks_completed():
                if PipelineType.INTEGRATION == self.pipeline.type:
                    tags = dict(
                        pipeline_run_id=self.pipeline_run.id,
                        pipeline_uuid=self.pipeline.uuid,
                    )

                    self.logger.info(
                        f'Calculate metrics for pipeline run {self.pipeline_run.id} started.',
                        tags=tags,
                    )
                    calculate_metrics(self.pipeline_run)
                    self.logger.info(
                        f'Calculate metrics for pipeline run {self.pipeline_run.id} completed.',
                        tags=merge_dict(tags, dict(metrics=self.pipeline_run.metrics)),
                    )

                pipeline_schedule = PipelineSchedule.query.get(self.pipeline_run.pipeline_schedule_id)
                if pipeline_schedule is not None and \
                        pipeline_schedule.status == PipelineSchedule.ScheduleStatus.ACTIVE and \
                        pipeline_schedule.schedule_type == PipelineSchedule.ScheduleType.TIME and \
                        pipeline_schedule.schedule_interval == PipelineSchedule.ScheduleInterval.ONCE:
                    pipeline_schedule.update(
                        status=PipelineSchedule.ScheduleStatus.INACTIVE,
                    )
                self.pipeline_run.update(
                    status=PipelineRun.PipelineRunStatus.COMPLETED,
                    completed_at=datetime.now(),
                )
                self.notification_sender.send_pipeline_run_success_message(
                    pipeline=self.pipeline,
                    pipeline_run=self.pipeline_run,
                )
                self.logger_manager.output_logs_to_destination()
            elif PipelineType.INTEGRATION == self.pipeline.type:
                self.__schedule_integration_pipeline(block_runs)
            else:
                self.__schedule_blocks(block_runs)

    @retry(retries=3, delay=5)
    def on_block_complete(self, block_uuid: str) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)
        block_run.update(
            status=BlockRun.BlockRunStatus.COMPLETED,
            completed_at=datetime.now(),
        )
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
            for b in self.pipeline_run.block_runs:
                b.refresh()
            self.schedule()

    @retry(retries=3, delay=5)
    def on_block_complete_without_schedule(self, block_uuid: str) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)
        block_run.update(
            status=BlockRun.BlockRunStatus.COMPLETED,
            completed_at=datetime.now(),
        )
        self.logger.info(
            f'BlockRun {block_run.id} (block_uuid: {block_uuid}) completes.',
            **self.__build_tags(
                block_run_id=block_run.id,
                block_uuid=block_run.block_uuid,
            ),
        )

    @retry(retries=3, delay=5)
    def on_block_failure(self, block_uuid: str, **kwargs) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)
        metrics = block_run.metrics or {}

        if 'error' in kwargs:
            metrics['error'] = kwargs['error']

        block_run.update(
            metrics=metrics,
            status=BlockRun.BlockRunStatus.FAILED,
        )

        tags = self.__build_tags(
            block_run_id=block_run.id,
            block_uuid=block_run.block_uuid,
        )

        self.logger.info(
            f'BlockRun {block_run.id} (block_uuid: {block_uuid}) failed.',
            **tags,
        )

        self.notification_sender.send_pipeline_run_failure_message(
            pipeline=self.pipeline,
            pipeline_run=self.pipeline_run,
        )

        self.pipeline_run.update(status=PipelineRun.PipelineRunStatus.FAILED)

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
    def executable_block_runs(self) -> List[BlockRun]:
        return [b for b in self.pipeline_run.block_runs if b.status in [
            BlockRun.BlockRunStatus.INITIAL,
            BlockRun.BlockRunStatus.QUEUED,
        ]]

    @property
    def completed_block_runs(self) -> List[BlockRun]:
        return [b for b in self.pipeline_run.block_runs if b.status == BlockRun.BlockRunStatus.COMPLETED]

    @property
    def queued_block_runs(self) -> List[BlockRun]:
        queued_block_runs = []
        for b in self.executable_block_runs:
            completed_block_uuids = set(b.block_uuid for b in self.completed_block_runs)
            block = self.pipeline.get_block(b.block_uuid)
            if block is not None and \
                    block.all_upstream_blocks_completed(completed_block_uuids):
                b.update(status=BlockRun.BlockRunStatus.QUEUED)
                queued_block_runs.append(b)

        return queued_block_runs

    def __schedule_blocks(self, block_runs: List[BlockRun] = None) -> None:
        # TODO: implement queueing logic
        block_runs_to_schedule = self.queued_block_runs if block_runs is None else block_runs
        block_runs_to_schedule = self.__fetch_crashed_block_runs() + block_runs_to_schedule

        for b in block_runs_to_schedule:
            tags = dict(
                block_run_id=b.id,
                block_uuid=b.block_uuid,
            )

            b.update(
                started_at=datetime.now(),
                status=BlockRun.BlockRunStatus.RUNNING,
            )

            self.logger.info(
                f'Start a process for BlockRun {b.id}',
                **self.__build_tags(**tags),
            )
            proc = create_process(run_block, (
                self.pipeline_run.id,
                b.id,
                get_variables(self.pipeline_run),
                self.__build_tags(**tags),
            ))
            execution_process_manager.set_block_process(self.pipeline_run.id, b.id, proc)
            proc.start()

    def __schedule_integration_pipeline(self, block_runs: List[BlockRun] = None) -> None:
        if execution_process_manager.has_pipeline_process(self.pipeline_run.id):
            return

        block_runs_to_schedule = self.executable_block_runs if block_runs is None else block_runs
        block_runs_to_schedule = self.__fetch_crashed_block_runs() + block_runs_to_schedule

        if len(block_runs_to_schedule) > 0:
            self.logger.info(
                f'Start a process for PipelineRun {self.pipeline_run.id}',
                **self.__build_tags(),
            )

            proc = create_process(target=run_integration_pipeline, args=(
                self.pipeline_run.id,
                [b.id for b in block_runs_to_schedule],
                get_variables(self.pipeline_run, dict(
                    pipeline_uuid=self.pipeline.uuid,
                )),
                self.__build_tags(),
            ))
            execution_process_manager.set_pipeline_process(self.pipeline_run.id, proc)
            proc.start()

    def __schedule_pipeline(self) -> None:
        if execution_process_manager.has_pipeline_process(self.pipeline_run.id):
            return
        self.logger.info(
            f'Start a process for PipelineRun {self.pipeline_run.id}',
            **self.__build_tags(),
        )
        proc = create_process(run_pipeline, (
            self.pipeline_run.id,
            get_variables(self.pipeline_run),
            self.__build_tags(),
        ))
        execution_process_manager.set_pipeline_process(self.pipeline_run.id, proc)
        proc.start()

    def __fetch_crashed_block_runs(self) -> None:
        running_block_runs = [b for b in self.pipeline_run.block_runs if b.status in [
            BlockRun.BlockRunStatus.RUNNING,
        ]]

        crashed_runs = []
        for br in running_block_runs:
            if not execution_process_manager.has_block_process(self.pipeline_run.id, br.id):
                br.update(status=BlockRun.BlockRunStatus.INITIAL)
                crashed_runs.append(br)

        return crashed_runs

    def __build_tags(self, **kwargs):
        return merge_dict(kwargs, dict(
            pipeline_run_id=self.pipeline_run.id,
            pipeline_schedule_id=self.pipeline_run.pipeline_schedule_id,
            pipeline_uuid=self.pipeline.uuid,
        ))


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
                all_block_runs,
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
                is_last_block_run=(index == max_index),
                selected_streams=[
                    tap_stream_id,
                ],
            )
            block_runs_and_configs = [
                (data_loader_block_run, shared_dict),
            ] + [(br, shared_dict) for br in transformer_block_runs] + [
                (data_exporter_block_run, shared_dict),
            ]

            outputs = []
            for idx2, tup in enumerate(block_runs_and_configs):
                block_run, template_runtime_configuration = tup

                tags_updated = merge_dict(tags, dict(
                    block_run_id=block_run.id,
                    block_uuid=block_run.block_uuid,
                ))
                block_run.update(
                    started_at=datetime.now(),
                    status=BlockRun.BlockRunStatus.RUNNING,
                )
                pipeline_scheduler.logger.info(
                    f'Start a process for BlockRun {block_run.id}',
                    **tags_updated,
                )

                output = run_block(
                    pipeline_run_id,
                    block_run.id,
                    variables,
                    tags_updated,
                    input_from_output=outputs[idx2 - 1] if idx2 >= 1 else None,
                    pipeline_type=PipelineType.INTEGRATION,
                    verify_output=False,
                    runtime_arguments=runtime_arguments,
                    schedule_after_complete=False,
                    template_runtime_configuration=template_runtime_configuration,
                )
                outputs.append(output)

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
                    calculate_metrics(pipeline_run)
                    pipeline_scheduler.logger.info(
                        f'Calculate metrics for pipeline run {pipeline_run.id} completed.',
                        **tags_updated,
                        tags=merge_dict(tags2, dict(metrics=pipeline_run.metrics)),
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
    pipeline_scheduler = PipelineScheduler(pipeline_run)

    pipeline = pipeline_scheduler.pipeline

    block_run = BlockRun.query.get(block_run_id)
    pipeline_scheduler.logger.info(f'Execute PipelineRun {pipeline_run.id}, BlockRun {block_run.id}: '
                                   f'pipeline {pipeline.uuid} block {block_run.block_uuid}',
                                   **tags)

    if schedule_after_complete:
        on_complete = pipeline_scheduler.on_block_complete
    else:
        on_complete = pipeline_scheduler.on_block_complete_without_schedule

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
        runtime_arguments=runtime_arguments,
        template_runtime_configuration=template_runtime_configuration,
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


def check_sla():
    repo_pipelines = set(Pipeline.get_all_pipelines(get_repo_path()))
    pipeline_schedules = \
        set([
            s.id
            for s in PipelineSchedule.active_schedules(pipeline_uuids=repo_pipelines)
        ])

    pipeline_runs = \
        PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id.in_(pipeline_schedules),
            PipelineRun.status.in_(IN_PROGRESS_STATUSES),
            PipelineRun.passed_sla.is_(False),
        ).all()

    if pipeline_runs:
        notification_sender = \
            NotificationSender(get_repo_config(get_repo_path()).notification_config)

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
    repo_pipelines = set(Pipeline.get_all_pipelines(get_repo_path()))

    active_pipeline_schedules = \
        list(PipelineSchedule.active_schedules(pipeline_uuids=repo_pipelines))

    for pipeline_schedule in active_pipeline_schedules:
        if pipeline_schedule.should_schedule():
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

            pipeline_run = PipelineRun.create(**payload)
            pipeline_scheduler = PipelineScheduler(pipeline_run)

            if is_integration:
                block_runs = BlockRun.query.filter(BlockRun.pipeline_run_id == pipeline_run.id).all()
                if len(block_runs) == 0:
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

    for r in active_pipeline_runs:
        try:
            r.refresh()
            PipelineScheduler(r).schedule()
        except Exception:
            print(f'Failed to schedule {r}')
            traceback.print_exc()
            continue
    execution_process_manager.clean_up_processes()


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
    variables['event'] = event_variables
    variables['execution_date'] = pipeline_run.execution_date
    variables['execution_partition'] = pipeline_run.execution_partition
    variables.update(extra_variables)

    return variables
