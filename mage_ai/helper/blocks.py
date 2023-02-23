from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.repo_manager import get_repo_path
from mage_ai.orchestration.db.models import BlockRun, PipelineRun
from mage_ai.orchestration.job_manager import job_manager
from mage_ai.shared.array import find
from typing import Dict


# These functions should only be run from the Mage tool
def overwrite_variables(_variables: Dict, pipeline_run, **kwargs):
    if pipeline_run is not None:
        pipeline_run.update(variables=_variables)


def run_block(_block_uuid, pipeline_run, **kwargs):
    if pipeline_run is not None:
        block_run = find(
            lambda run: run.block_uuid == _block_uuid,
            pipeline_run.block_runs,
        )
        if block_run is None:
            return
        
        pipeline = Pipeline.get(pipeline_run.pipeline_uuid, get_repo_path())
        block_run.refresh()
        block_run.update(status=BlockRun.BlockRunStatus.INITIAL)

        block = pipeline.get_block(_block_uuid)
        downstream_blocks = block.get_all_downstream_blocks()

        pipeline_run.refresh()
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        current_block_uuid = kwargs.get('block_uuid')
        for b in downstream_blocks:
            br = find(
                lambda run: run.block_uuid == b.uuid,
                pipeline_run.block_runs,
            )
            if br is None:
                continue
            br.refresh()
            br.update(status=BlockRun.BlockRunStatus.INITIAL)
            if current_block_uuid != br.block_uuid:
                job_manager.kill_block_run_job(br.id)
