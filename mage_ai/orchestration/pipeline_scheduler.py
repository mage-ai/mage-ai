from datetime import datetime
from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
from mage_ai.data_preparation.logger_manager import LoggerManager
from mage_ai.data_preparation.logging.logger import DictLogger
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.data_preparation.variable_manager import get_global_variables
from mage_ai.orchestration.db.models import BlockRun, EventMatcher, PipelineRun, PipelineSchedule
from mage_ai.shared.constants import ENV_PROD
from mage_ai.shared.hash import merge_dict
from mage_ai.orchestration.execution_process_manager import execution_process_manager
from mage_ai.orchestration.notification.config import NotificationConfig
from mage_ai.orchestration.notification.sender import NotificationSender
from typing import Dict
import multiprocessing
import traceback


class PipelineScheduler:
    def __init__(
        self,
        pipeline_run: PipelineRun,
    ) -> None:
        self.pipeline_run = pipeline_run
        self.pipeline = Pipeline.get(pipeline_run.pipeline_uuid)
        logger_manager = LoggerManager.get_logger(
            pipeline_uuid=self.pipeline.uuid,
            partition=self.pipeline_run.execution_partition,
        )
        self.logger = DictLogger(logger_manager)
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

    def schedule(self) -> None:
        if self.pipeline.type != PipelineType.STREAMING:
            if self.pipeline_run.all_blocks_completed():
                self.notification_sender.send_pipeline_run_success_message(
                    pipeline=self.pipeline,
                    pipeline_run=self.pipeline_run,
                )
                self.pipeline_run.update(
                    status=PipelineRun.PipelineRunStatus.COMPLETED,
                    completed_at=datetime.now(),
                )
            else:
                self.__schedule_blocks()
        else:
            self.__schedule_pipeline()

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

    def on_block_failure(self, block_uuid: str) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)
        block_run.update(status=BlockRun.BlockRunStatus.FAILED)
        self.logger.info(
            f'BlockRun {block_run.id} (block_uuid: {block_uuid}) failed.',
            **self.__build_tags(
                block_run_id=block_run.id,
                block_uuid=block_run.block_uuid,
            ),
        )
        self.notification_sender.send_pipeline_run_failure_message(
            pipeline=self.pipeline,
            pipeline_run=self.pipeline_run,
        )
        self.pipeline_run.update(status=PipelineRun.PipelineRunStatus.FAILED)

    def __schedule_blocks(self) -> None:
        executable_block_runs = [b for b in self.pipeline_run.block_runs
                                 if b.status in [
                                        BlockRun.BlockRunStatus.INITIAL,
                                        BlockRun.BlockRunStatus.QUEUED,
                                    ]]
        completed_block_runs = [b for b in self.pipeline_run.block_runs
                                if b.status == BlockRun.BlockRunStatus.COMPLETED]
        queued_block_runs = []
        for b in executable_block_runs:
            completed_block_uuids = set(b.block_uuid for b in completed_block_runs)
            block = self.pipeline.get_block(b.block_uuid)
            if block is not None and \
                    block.all_upstream_blocks_completed(completed_block_uuids):
                b.update(status=BlockRun.BlockRunStatus.QUEUED)
                queued_block_runs.append(b)

        # TODO: implement queueing logic
        for b in queued_block_runs:
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
            variables = merge_dict(
                merge_dict(
                    get_global_variables(self.pipeline.uuid) or dict(),
                    self.pipeline_run.pipeline_schedule.variables or dict(),
                ),
                self.pipeline_run.variables or dict(),
            )
            variables['env'] = ENV_PROD
            variables['execution_date'] = self.pipeline_run.execution_date
            proc = multiprocessing.Process(target=run_block, args=(
                self.pipeline_run.id,
                b.id,
                variables,
                self.__build_tags(**tags),
            ))
            execution_process_manager.set_block_process(self.pipeline_run.id, b.id, proc)
            proc.start()

    def __schedule_pipeline(self) -> None:
        if execution_process_manager.has_pipeline_process(self.pipeline_run.id):
            return
        self.logger.info(
            f'Start a process for PipelineRun {self.pipeline_run.id}',
            **self.__build_tags(),
        )
        variables = merge_dict(
            merge_dict(
                get_global_variables(self.pipeline.uuid) or dict(),
                self.pipeline_run.pipeline_schedule.variables or dict(),
            ),
            self.pipeline_run.variables or dict(),
        )
        variables['env'] = ENV_PROD
        variables['execution_date'] = self.pipeline_run.execution_date
        proc = multiprocessing.Process(target=run_pipeline, args=(
            self.pipeline_run.id,
            variables,
            self.__build_tags(),
        ))
        execution_process_manager.set_pipeline_process(self.pipeline_run.id, proc)
        proc.start()

    def __build_tags(self, **kwargs):
        return merge_dict(kwargs, dict(
            pipeline_run_id=self.pipeline_run.id,
            pipeline_schedule_id=self.pipeline_run.pipeline_schedule_id,
            pipeline_uuid=self.pipeline.uuid,
        ))


def run_block(pipeline_run_id, block_run_id, variables, tags):
    pipeline_run = PipelineRun.query.get(pipeline_run_id)
    pipeline_scheduler = PipelineScheduler(pipeline_run)
    pipeline = pipeline_scheduler.pipeline
    block_run = BlockRun.query.get(block_run_id)
    pipeline_scheduler.logger.info(f'Execute PipelineRun {pipeline_run.id}, BlockRun {block_run.id}: '
                                   f'pipeline {pipeline.uuid} block {block_run.block_uuid}',
                                   **tags)

    ExecutorFactory.get_block_executor(
        pipeline,
        block_run.block_uuid,
        execution_partition=pipeline_run.execution_partition,
    ).execute(
        analyze_outputs=False,
        block_run_id=block_run.id,
        global_vars=variables,
        update_status=False,
        on_complete=pipeline_scheduler.on_block_complete,
        on_failure=pipeline_scheduler.on_block_failure,
        tags=tags,
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


def schedule_all():
    """
    1. Check whether any new pipeline runs need to be scheduled.
    2. In active pipeline runs, check whether any block runs need to be scheduled.
    """
    repo_pipelines = set(Pipeline.get_all_pipelines(get_repo_path()))

    active_pipeline_schedules = \
        list(filter(lambda s: s.pipeline_uuid in repo_pipelines, PipelineSchedule.active_schedules()))

    for pipeline_schedule in active_pipeline_schedules:
        if pipeline_schedule.should_schedule():
            payload = dict(
                execution_date=pipeline_schedule.current_execution_date(),
                pipeline_schedule_id=pipeline_schedule.id,
                pipeline_uuid=pipeline_schedule.pipeline_uuid,
                variables=pipeline_schedule.variables,
            )
            pipeline_run = PipelineRun.create(**payload)
            PipelineScheduler(pipeline_run).start(should_schedule=False)

    active_pipeline_runs = \
        list(filter(lambda r: r.pipeline_uuid in repo_pipelines, PipelineRun.active_runs()))

    for r in active_pipeline_runs:
        try:
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
