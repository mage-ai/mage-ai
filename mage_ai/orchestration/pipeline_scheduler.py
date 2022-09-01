from datetime import datetime
from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
from mage_ai.data_preparation.logger_manager import LoggerManager
from mage_ai.data_preparation.logging.logger import Logger
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models import BlockRun, EventMatcher, PipelineRun, PipelineSchedule
from mage_ai.shared.hash import merge_dict
from typing import Dict
import multiprocessing


class PipelineScheduler:
    def __init__(self, pipeline_run: PipelineRun) -> None:
        self.pipeline_run = pipeline_run
        self.pipeline = Pipeline.get(pipeline_run.pipeline_uuid)
        logger_manager = LoggerManager.get_logger(
            pipeline_uuid=self.pipeline.uuid,
            partition=self.pipeline_run.execution_partition,
        )
        self.logger = Logger(logger_manager)

    def start(self, should_schedule: bool = True) -> None:
        if self.pipeline_run.status == PipelineRun.PipelineRunStatus.RUNNING:
            return
        self.pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        if should_schedule:
            self.schedule()

    def stop(self) -> None:
        self.pipeline_run.update(status=PipelineRun.PipelineRunStatus.CANCELLED)

        # Cancel all the block runs
        for b in self.pipeline_run.block_runs:
            b.update(status=BlockRun.BlockRunStatus.CANCELLED)

    def schedule(self) -> None:
        if self.pipeline_run.all_blocks_completed():
            self.pipeline_run.update(
                status=PipelineRun.PipelineRunStatus.COMPLETED,
                completed_at=datetime.now(),
            )
        self.__schedule_blocks()

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

        self.pipeline_run.update(status=PipelineRun.PipelineRunStatus.FAILED)

    def __schedule_blocks(self) -> None:
        executable_block_runs = [b for b in self.pipeline_run.block_runs
                                 if b.status == BlockRun.BlockRunStatus.INITIAL]
        completed_block_runs = [b for b in self.pipeline_run.block_runs
                                if b.status == BlockRun.BlockRunStatus.COMPLETED]
        queued_block_runs = []
        for b in executable_block_runs:
            completed_block_uuids = set(b.block_uuid for b in completed_block_runs)
            block = self.pipeline.get_block(b.block_uuid)
            if block.all_upstream_blocks_completed(completed_block_uuids):
                b.update(status=BlockRun.BlockRunStatus.QUEUED)
                queued_block_runs.append(b)

        # TODO: Support processing queued block runs in separate instances
        for b in queued_block_runs:
            tags = dict(
                block_run_id=b.id,
                block_uuid=b.block_uuid,
            )

            b.update(status=BlockRun.BlockRunStatus.RUNNING)

            self.logger.info(
                f'Start a process for BlockRun {b.id}',
                **self.__build_tags(**tags),
            )

            def __run_block():
                self.logger.info(f'Execute PipelineRun {self.pipeline_run.id}, BlockRun {b.id}: '
                                 f'pipeline {self.pipeline.uuid} block {b.block_uuid}',
                                 **self.__build_tags(**tags))
                ExecutorFactory.get_block_executor(
                    self.pipeline,
                    b.block_uuid,
                    execution_partition=self.pipeline_run.execution_partition,
                ).execute(
                    analyze_outputs=False,
                    block_run_id=b.id,
                    global_vars=self.pipeline_run.pipeline_schedule.variables or dict(),
                    update_status=False,
                    on_complete=self.on_block_complete,
                    on_failure=self.on_block_failure,
                    tags=self.__build_tags(**tags),
                )

            proc = multiprocessing.Process(target=__run_block)
            proc.start()

    def __build_tags(self, **kwargs):
        return merge_dict(kwargs, dict(
            pipeline_run_id=self.pipeline_run.id,
            pipeline_schedule_id=self.pipeline_run.pipeline_schedule_id,
            pipeline_uuid=self.pipeline.uuid,
        ))


def schedule_all():
    """
    1. Check whether any new pipeline runs need to be scheduled.
    2. In active pipeline runs, check whether any block runs need to be scheduled.
    """
    active_pipeline_schedules = PipelineSchedule.active_schedules()

    for pipeline_schedule in active_pipeline_schedules:
        if pipeline_schedule.should_schedule():
            payload = dict(
                execution_date=pipeline_schedule.current_execution_date(),
                pipeline_schedule_id=pipeline_schedule.id,
                pipeline_uuid=pipeline_schedule.pipeline_uuid,
            )
            pipeline_run = PipelineRun.create(**payload)
            PipelineScheduler(pipeline_run).start(should_schedule=False)
    active_pipeline_runs = PipelineRun.active_runs()
    for r in active_pipeline_runs:
        PipelineScheduler(r).schedule()


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
                )
                pipeline_run = PipelineRun.create(**payload)
                PipelineScheduler(pipeline_run).start(should_schedule=True)
        else:
            print(f'Event not matched with {e}')
