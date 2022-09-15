from datetime import datetime
from mage_ai.orchestration.db.models import BlockRun, PipelineRun, PipelineSchedule


def check_status(
    pipeline_uuid: str,
    execution_date: datetime,
    block_uuid: str = None,
) -> bool:
    pipeline_run = (
        PipelineRun
        .query
        .join(PipelineRun.pipeline_schedule)
        .filter(PipelineSchedule.pipeline_uuid == pipeline_uuid)
        .filter(PipelineRun.execution_date == execution_date)
        .first()
    )
    pipeline_run.refresh()
    if pipeline_run is None:
        return False

    if block_uuid is not None:
        block_run = next(filter(lambda run: run.block_uuid == block_uuid, pipeline_run.block_runs))
        if block_run is None:
            return False
        return block_run.status == BlockRun.BlockRunStatus.COMPLETED
    else:
        return pipeline_run.status == PipelineRun.PipelineRunStatus.COMPLETED
