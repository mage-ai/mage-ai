from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models import BlockRun, PipelineRun


class PipelineScheduler:
    def __init__(self, pipeline_run: PipelineRun) -> None:
        self.pipeline_run = pipeline_run
        self.pipeline = Pipeline.get(pipeline_run.pipeline_uuid)

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
            self.pipeline_run.update(status=PipelineRun.PipelineRunStatus.COMPLETED)
        self.__schedule_blocks()

    def on_block_complete(self, block_uuid: str) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)
        block_run.update(status=BlockRun.BlockRunStatus.COMPLETED)
        if self.pipeline_run.status != PipelineRun.PipelineRunStatus.RUNNING:
            return
        else:
            self.schedule()

    def on_block_failure(self, block_uuid: str) -> None:
        block_run = BlockRun.get(pipeline_run_id=self.pipeline_run.id, block_uuid=block_uuid)
        block_run.update(status=BlockRun.BlockRunStatus.FAILED)

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

        # TODO: Support processing queued block runs in separate workers/processes
        for b in queued_block_runs:
            b.update(status=BlockRun.BlockRunStatus.RUNNING)
            ExecutorFactory.get_block_executor(self.pipeline, b.block_uuid).execute(
                analyze_outputs=False,
                execution_partition=self.pipeline_run.execution_partition,
                update_status=False,
                on_complete=self.on_block_complete,
                on_failure=self.on_block_failure,
            )
