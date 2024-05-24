from datetime import datetime, timedelta, timezone

from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.utils import warn_for_repo_path
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find

PIPELINE_FAILURE_STATUSES = [
    PipelineRun.PipelineRunStatus.CANCELLED,
    PipelineRun.PipelineRunStatus.FAILED,
]

BLOCK_FAILURE_STATUSES = [
    BlockRun.BlockRunStatus.CANCELLED,
    BlockRun.BlockRunStatus.FAILED,
]


def check_status(
    pipeline_uuid: str,
    execution_date: datetime,
    repo_path: str = None,
    block_uuid: str = None,
    hours: int = 24,
) -> bool:
    __validate_pipeline_and_block(pipeline_uuid, block_uuid, repo_path=repo_path)

    execution_date = execution_date.replace(tzinfo=timezone.utc)
    pipeline_run = (
        PipelineRun
        .query
        .join(PipelineRun.pipeline_schedule)
        .filter(PipelineSchedule.pipeline_uuid == pipeline_uuid)
        .filter(PipelineRun.execution_date >= execution_date - timedelta(hours=hours))
        .filter(PipelineRun.execution_date <= execution_date)
        .order_by(PipelineRun.execution_date.desc())
        .first()
    )

    if pipeline_run is None:
        return False

    pipeline_run.refresh()

    if block_uuid is not None:
        block_run = find(lambda run: run.block_uuid == block_uuid, pipeline_run.block_runs)
        if block_run is None:
            return False

        block_run.refresh()
        if block_run.status in BLOCK_FAILURE_STATUSES:
            raise Exception('Upstream block run failed, stopping sensor...')
        else:
            return block_run.status == BlockRun.BlockRunStatus.COMPLETED
    else:
        if pipeline_run.status in PIPELINE_FAILURE_STATUSES:
            raise Exception('Upstream pipeline run failed, stopping sensor...')
        else:
            return pipeline_run.status == PipelineRun.PipelineRunStatus.COMPLETED


def __validate_pipeline_and_block(pipeline_uuid: str, block_uuid: str, repo_path: str = None):
    warn_for_repo_path(repo_path=repo_path)

    if repo_path is None:
        repo_path = get_repo_path()

    if pipeline_uuid not in Pipeline.get_all_pipelines(repo_path=repo_path):
        raise Exception('Pipeline not found, stopping sensor...')

    pipeline = Pipeline.get(pipeline_uuid, repo_path=repo_path)

    if block_uuid is not None:
        block = pipeline.get_block(block_uuid)
        if block is None:
            raise Exception('Block not found in pipeline, stopping sensor...')
