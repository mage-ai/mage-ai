from datetime import datetime
from mage_ai.orchestration.db.models import BlockRun, PipelineRun


def check_status(
    pipeline_schedule_id: int,
    partition: datetime,
    block_uuid: str = None,
    status: BlockRun.BlockRunStatus = None,
) -> bool:
    pipeline_run = (
        PipelineRun
        .query
        .filter(PipelineRun.pipeline_schedule_id == pipeline_schedule_id)
        .filter(PipelineRun.execution_date == partition)
        .first()
    )
    if pipeline_run is None:
        return False

    if block_uuid is not None:
        block_run = next(filter(lambda run: run.block_uuid == block_uuid, pipeline_run.block_runs))
        if block_run is None:
            return False
        if status is not None:
            return block_run.status == status
        else:
            outputs = block_run.get_outputs()
            return len(outputs) > 0
    else:
        if status is not None:
            return pipeline_run.status.value == status.value
        else:
            # what to check for if we only have pipeline_schedule_id and partition
            return False
    
