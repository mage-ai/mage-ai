import os

from mage_ai.data_preparation.executors.executor_factory import ExecutorFactory
from mage_ai.data_preparation.executors.process_block_executor import (
    ProcessBlockExecutor,
)
from mage_ai.data_preparation.models.constants import (
    BlockType,
    ExecutorType,
    PipelineType,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.pipelines.environments import (
    initialize_pipeline_environment,
)
from mage_ai.orchestration.db.models.schedules import BlockRun
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import (
    create_pipeline_run_with_schedule,
    create_pipeline_with_blocks,
    create_pipeline_with_dynamic_blocks,
)


class ProcessBlockExecutorTest(BaseApiTestCase):
    def setUp(self):
        self.pipeline_uuid = 'test_process_block_executor'
        self.pipeline = create_pipeline_with_blocks(
            self.pipeline_uuid,
            self.repo_path,
        )

        with open(os.path.join(self.pipeline.dir_path, 'requirements.txt'), 'w') as f:
            f.write('''nba_api
asyncua
''')

    async def test_execute(self):
        await initialize_pipeline_environment(self.pipeline)
        block = self.pipeline.get_block('block1')
        block.update(dict(executor_type=ExecutorType.PROCESS))
        self.pipeline.save()

        pipeline = Pipeline.get(self.pipeline_uuid)

        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid=self.pipeline_uuid)
        block_run = BlockRun.query.filter(BlockRun.pipeline_run_id == pipeline_run.id, BlockRun.block_uuid == 'block1').one_or_none()

        with open(block.file_path, 'w') as file:
            file.write('''import pandas as pd
import nba_api

@data_loader
def load_data():
    data = {'col1': [1, 3], 'col2': [2, 4]}
    df = pd.DataFrame(data)
    return [df]
            ''')

        def on_complete(block_uuid, metrics=None):
            pass

        def on_failure(block_uuid, error):
            pass

        retry_config = {'retries': 5, 'delay': 2}
        runtime_arguments = {'arg1': 'value1'}
        template_runtime_configuration = {'config': 'value'}

        block_executor = ExecutorFactory.get_block_executor(
            pipeline,
            block.uuid,
            block_run_id=block_run.id,
        )
        self.assertTrue(isinstance(block_executor, ProcessBlockExecutor))
        block_executor.execute(
            block_run_id=block_run.id,
            global_vars=dict(var1='value1'),
            on_complete=on_complete,
            on_failure=on_failure,
            pipeline_run_id=pipeline_run.id,
            retry_config=retry_config,
            runtime_arguments=runtime_arguments,
            template_runtime_configuration=template_runtime_configuration,
            verify_output=True,
            env=merge_dict(os.environ, dict(ENV='test')),
        )
