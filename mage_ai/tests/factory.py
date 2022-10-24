from datetime import datetime
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models import PipelineRun, PipelineSchedule


def create_pipeline(name: str, repo_path: str):
    pipeline = Pipeline.create(
        name,
        repo_path=repo_path,
    )
    return pipeline


def create_pipeline_with_blocks(name: str, repo_path: str):
    pipeline = Pipeline.create(
        name,
        repo_path=repo_path,
    )
    block1 = Block.create('block1', 'data_loader', repo_path, language='python')
    block2 = Block.create('block2', 'transformer', repo_path, language='python')
    block3 = Block.create('block3', 'transformer', repo_path, language='python')
    block4 = Block.create('block4', 'data_exporter', repo_path, language='python')
    pipeline.add_block(block1)
    pipeline.add_block(block2, upstream_block_uuids=['block1'])
    pipeline.add_block(block3, upstream_block_uuids=['block1'])
    pipeline.add_block(block4, upstream_block_uuids=['block2', 'block3'])
    return pipeline


def create_pipeline_run(pipeline_uuid: str):
    pipeline_run = PipelineRun.create(pipeline_uuid='test_pipeline')
    return pipeline_run


def create_pipeline_run_with_schedule(
    pipeline_uuid: str,
    execution_date: datetime = None,
    pipeline_schedule_id: int = None,
):
    if pipeline_schedule_id is None:
        pipeline_schedule = PipelineSchedule.create(pipeline_uuid=pipeline_uuid)
        pipeline_schedule_id = pipeline_schedule.id
    pipeline_run = PipelineRun.create(
        execution_date=execution_date,
        pipeline_uuid=pipeline_uuid,
        pipeline_schedule_id=pipeline_schedule_id,
    )
    return pipeline_run
