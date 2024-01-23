from datetime import datetime

from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.data_preparation.models.constants import BlockStatus
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import (
    create_pipeline_run_with_schedule,
    create_pipeline_with_blocks,
)


class PipelineExecutorTest(DBTestCase):
    # def test_execute_without_pipeline_run_id(self):
    #     pipeline = create_pipeline_with_blocks(
    #         'test pipeline 1',
    #         self.repo_path,
    #     )
    #     pipeline_executor = PipelineExecutor(pipeline)
    #     pipeline_executor.execute(update_status=True)
    #     for b in pipeline.blocks_by_uuid.values():
    #         self.assertEqual(b.status, BlockStatus.EXECUTED)

    def test_execute_with_pipeline_run_id(self):
        pipeline = create_pipeline_with_blocks(
            'test pipeline 2',
            self.repo_path,
        )
        data_loader_block = pipeline.get_block('block1')
        transformer_block = pipeline.get_block('block2')
        with open(data_loader_block.file_path, 'w') as file:
            file.write('''
@data_loader
def load_data(**kwargs):
    kwargs['context']['a'] = 1
    return 'ok1'
            ''')
        with open(transformer_block.file_path, 'w') as file:
            file.write('''
@transformer
def transform(*args, **kwargs):
    if args[0] != 'ok1':
        raise Exception('upstream block output has wrong value.')
    if kwargs['context'].get('a') != 1:
        raise Exception('kwargs context has wrong value.')
    if kwargs['retry']['attempts'] != 1:
        raise Exception(f'retry attempts has wrong value.')
    return 'ok2'
            ''')
        execution_date = datetime.now()
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline_2',
            execution_date=execution_date,
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        pipeline_executor = PipelineExecutor(
            pipeline,
            execution_partition=pipeline_run.execution_partition,
        )
        pipeline_executor.execute(pipeline_run_id=pipeline_run.id, update_status=True)
        for b in pipeline_run.block_runs:
            self.assertEqual(b.status, BlockRun.BlockRunStatus.COMPLETED)
        for b in pipeline.blocks_by_uuid.values():
            self.assertEqual(b.status, BlockStatus.NOT_EXECUTED)
