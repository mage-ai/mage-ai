import os
from datetime import datetime
from typing import Dict
from unittest.mock import ANY, MagicMock, patch
from uuid import uuid4

from faker import Faker

from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dynamic.child import DynamicChildController
from mage_ai.data_preparation.models.block.hook.block import HookBlock
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks
from mage_ai.tests.shared.mixins import build_hooks


class BlockExecutorTest(BaseApiTestCase):
    def setUp(self):
        self.pipeline = MagicMock()
        self.pipeline.uuid = 'pipeline_uuid'
        self.pipeline.repo_config = MagicMock()
        self.block_uuid = 'block_uuid'
        self.execution_partition = 'partition'
        self.logger_manager = MagicMock()
        self.logger = MagicMock()
        self.block = MagicMock(spec=Block)
        self.block.configuration = {}
        self.block.upstream_blocks = []
        self.block.type = BlockType.DBT
        self.block.replicated_block = None

        self.pipeline.get_block.return_value = self.block
        self.pipeline.repo_config.retry_config = {'retries': 3, 'delay': 1}
        self.pipeline.repo_config.variables_dir = os.path.join(os.getcwd(), 'mage_data')

        self.logger_manager.logger = self.logger
        self.logger_manager.output_logs_to_destination = MagicMock()

        self.block.uuid = self.block_uuid
        self.block.template_runtime_configuration = None
        self.block.conditional_blocks = []
        self.block.callback_block = None
        self.block.callback_blocks = []

        self.block_executor = BlockExecutor(
            self.pipeline,
            self.block_uuid,
            self.execution_partition,
        )
        self.block_executor.logger_manager = self.logger_manager
        self.block_executor.logger = self.logger
        self.block_executor.block = self.block

        self.faker = Faker()

        arr = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
            return_blocks=True,
        )
        self.pipeline1 = arr[0]
        self.blocks = arr[1]

    def tearDown(self):
        BlockRun.query.delete()
        PipelineRun.query.delete()
        self.pipeline1.delete()
        super().tearDown()

    def test_execute(self):
        analyze_outputs = False
        callback_url = 'http://example.com/callback'
        global_vars = {
            'var1': 'value1',
        }
        update_status = True

        def on_complete(block_uuid, metrics: Dict = None):
            pass

        def on_failure(block_uuid, error):
            pass

        def on_start(block_uuid):
            pass

        input_from_output = {'input': 'output'}
        verify_output = True
        retry_config = {'retries': 5, 'delay': 2}
        runtime_arguments = {'arg1': 'value1'}
        template_runtime_configuration = {'config': 'value'}

        self.block_executor._execute_conditional = MagicMock(return_value=True)
        self.block_executor._execute = MagicMock(return_value={'result': 'success'})
        # self.block.run_tests = MagicMock()
        self.block_executor._execute_callback = MagicMock()

        result = self.block_executor.execute(
            analyze_outputs=analyze_outputs,
            callback_url=callback_url,
            global_vars=global_vars,
            update_status=update_status,
            on_complete=on_complete,
            on_failure=on_failure,
            on_start=on_start,
            input_from_output=input_from_output,
            verify_output=verify_output,
            retry_config=retry_config,
            runtime_arguments=runtime_arguments,
            template_runtime_configuration=template_runtime_configuration,
        )

        self.assertEqual(result, {'result': 'success'})
        self.pipeline.get_block.assert_called_once_with(self.block_uuid, check_template=True)
        self.assertEqual(self.block.template_runtime_configuration, template_runtime_configuration)
        self.block_executor._execute_conditional.assert_called_once_with(
            dynamic_block_index=None,
            dynamic_upstream_block_uuids=None,
            global_vars=global_vars,
            logging_tags={
                'block_type': BlockType.DBT,
                'block_uuid': self.block_uuid,
                'pipeline_uuid': self.pipeline.uuid,
            },
            pipeline_run=None,
        )
        self.block_executor._execute.assert_called_once_with(
            analyze_outputs=analyze_outputs,
            block_run_id=None,
            block_run_outputs_cache=None,
            cache_block_output_in_memory=False,
            callback_url=callback_url,
            global_vars=merge_dict(global_vars, dict(retry=dict(attempts=1))),
            input_from_output=input_from_output,
            logging_tags={
                'block_type': BlockType.DBT,
                'block_uuid': self.block_uuid,
                'pipeline_uuid': self.pipeline.uuid,
            },
            pipeline_run_id=None,
            update_status=update_status,
            verify_output=verify_output,
            runtime_arguments=runtime_arguments,
            template_runtime_configuration=template_runtime_configuration,
            dynamic_block_index=None,
            dynamic_block_indexes=None,
            dynamic_block_uuid=None,
            dynamic_upstream_block_uuids=None,
            block_run_dicts=None,
            data_integration_metadata=None,
            pipeline_run=None,
        )
        # self.block.run_tests.assert_called_once_with(
        #     execution_partition=self.execution_partition,
        #     global_vars=global_vars,
        #     logger=self.logger,
        #     logging_tags={
        #         'block_type': BlockType.DBT,
        #         'block_uuid': self.block_uuid,
        #         'pipeline_uuid': self.pipeline.uuid,
        #     },
        #     update_tests=False,
        #     dynamic_block_uuid=dynamic_block_uuid,
        # )
        self.block_executor._execute_callback.assert_called_with(
            'on_success',
            block_run_id=None,
            callback_kwargs=dict(retry=dict(attempts=1)),
            dynamic_block_index=None,
            dynamic_upstream_block_uuids=None,
            global_vars=global_vars,
            logging_tags={
                'block_type': BlockType.DBT,
                'block_uuid': self.block_uuid,
                'pipeline_uuid': self.pipeline.uuid,
            },
            pipeline_run=None,
        )
        self.logger_manager.output_logs_to_destination.assert_called_once()

    def test_execute_conditional(self):
        self.block.conditional_blocks = [MagicMock(), MagicMock()]

        self.block.conditional_blocks[0].execute_conditional.return_value = True
        self.block.conditional_blocks[1].execute_conditional.return_value = False

        result = self.block_executor._execute_conditional(
            dynamic_block_index=None,
            dynamic_upstream_block_uuids=None,
            global_vars={},
            logging_tags={},
            pipeline_run=None,
        )

        self.assertFalse(result)
        expected_kwargs = dict(
            dynamic_block_index=None,
            dynamic_upstream_block_uuids=None,
            execution_partition=self.execution_partition,
            global_vars={},
            logger=self.logger,
            logging_tags={},
            pipeline_run=None,
        )
        self.block.conditional_blocks[0].execute_conditional.assert_called_once_with(
            self.block,
            **expected_kwargs,
        )
        self.block.conditional_blocks[1].execute_conditional.assert_called_once_with(
            self.block,
            **expected_kwargs,
        )

    def test_execute_conditional_exception(self):
        self.block.conditional_blocks = [MagicMock()]

        self.block.conditional_blocks[0].execute_conditional.side_effect = Exception('Error')

        result = self.block_executor._execute_conditional(
            dynamic_block_index=None,
            dynamic_upstream_block_uuids=None,
            global_vars={},
            logging_tags={},
            pipeline_run=None,
        )

        self.assertFalse(result)
        self.block.conditional_blocks[0].execute_conditional.assert_called_once_with(
            self.block,
            dynamic_block_index=None,
            dynamic_upstream_block_uuids=None,
            execution_partition=self.execution_partition,
            global_vars={},
            logger=self.logger,
            logging_tags={},
            pipeline_run=None,
        )

    def test_execute_callback(self):
        self.block.callback_blocks = [MagicMock(), MagicMock()]
        self.block.callback_block = MagicMock()

        self.block_executor._execute_callback(
            callback='on_success',
            global_vars=dict(retry=dict(attempts=1)),
            logging_tags={},
            pipeline_run=None,
            dynamic_block_index=None,
            dynamic_upstream_block_uuids=None,
        )

        expected_kwargs = dict(
            callback_kwargs=None,
            dynamic_block_index=None,
            dynamic_upstream_block_uuids=None,
            execution_partition=self.execution_partition,
            global_vars=dict(retry=dict(attempts=1)),
            logger=self.logger,
            logging_tags={},
            parent_block=self.block,
            pipeline_run=None,
            upstream_block_uuids_override=[],
        )

        self.block.callback_block.execute_callback.assert_called_once_with(
            'on_success',
            **expected_kwargs,
        )
        self.block.callback_blocks[0].execute_callback.assert_called_once_with(
            'on_success',
            **expected_kwargs,
        )
        self.block.callback_blocks[1].execute_callback.assert_called_once_with(
            'on_success',
            **expected_kwargs,
        )

    def test_hook_block(self):
        _global_hooks, _hooks, hooks_match, _hooks_miss = build_hooks(self, self.pipeline1)

        hook = hooks_match[0]

        pipeline_run = PipelineRun.create(
            pipeline_schedule_id=0,
            pipeline_uuid=self.pipeline1.uuid,
        )
        block_run = BlockRun.create(
            block_uuid=hook.uuid,
            metrics=dict(
                hook=hook.to_dict(include_all=True),
                hook_variables=dict(mage=1),
            ),
            pipeline_run_id=pipeline_run.id,
        )

        executor = BlockExecutor(
            self.pipeline1,
            hook.uuid,
        )

        def __is_feature_enabled(feature_uuid):
            return FeatureUUID.GLOBAL_HOOKS == feature_uuid

        value = uuid4().hex

        class CustomHookBlock(HookBlock):
            def execute_sync(self, *args, **kwargs):
                return value, kwargs['global_vars']

        with patch('mage_ai.data_preparation.models.block.hook.block.HookBlock', CustomHookBlock):
            with patch('.'.join([
                'mage_ai',
                'data_preparation',
                'executors',
                'block_executor',
                'Project',
                'is_feature_enabled_in_root_or_active_project',
            ]), __is_feature_enabled):
                result, variables = executor.execute(block_run_id=block_run.id)

                self.assertEqual(value, result)
                self.assertEqual(executor.block.uuid, hook.uuid)
                self.assertEqual(executor.block.hook, hook)
                self.assertEqual(executor.block.type, BlockType.HOOK)

    def test_block_run_for_dynamic_block(self):
        block1 = self.blocks[0]
        block1.configuration = dict(dynamic=True)
        self.pipeline1.add_block(block1)

        pipeline_run = PipelineRun.create(
            execution_date=datetime.utcnow(),
            pipeline_schedule_id=0,
            pipeline_uuid=self.pipeline1.uuid,
        )
        block_run = BlockRun.create(
            block_uuid=block1.uuid,
            pipeline_run_id=pipeline_run.id,
        )

        executor = BlockExecutor(
            self.pipeline1,
            block_run.block_uuid,
            execution_partition=pipeline_run.execution_partition,
        )

        children = 5
        child_data = [i for i in range(children)]
        child_metadata = None

        def __on_complete(
            block_uuid: str,
            metrics: Dict = None,
            block1=block1,
            children=children,
            test_case=self,
        ):
            test_case.assertEqual(block_uuid, block1.uuid)

        def __execute_sync(
            child_data=child_data,
            child_metadata=child_metadata,
            *args,
            **kwargs,
        ):
            return dict(output=[
                child_data,
                child_metadata,
            ])

        with patch.object(self.pipeline1, 'get_block', lambda _x: block1):
            with patch.object(block1, 'execute_sync', __execute_sync):
                executor.execute(block_run_id=block_run.id, on_complete=__on_complete)

    def test_block_run_for_dynamic_child_block(self):
        pipeline, blocks = create_pipeline_with_blocks(
            'dynamic_child_block',
            self.repo_path,
            return_blocks=True,
        )

        block1 = blocks[0]
        block1.configuration = dict(dynamic=True)
        pipeline.add_block(block1)
        block2 = blocks[1]

        pipeline_run = PipelineRun.create(
            execution_date=datetime.utcnow(),
            pipeline_schedule_id=0,
            pipeline_uuid=pipeline.uuid,
        )
        block_run = BlockRun.create(
            block_uuid=block2.uuid,
            pipeline_run_id=pipeline_run.id,
        )

        executor = BlockExecutor(
            pipeline,
            block_run.block_uuid,
            block_run_id=block_run.id,
            execution_partition=pipeline_run.execution_partition,
        )

        self.assertTrue(isinstance(executor.block, DynamicChildController))

        with patch.object(executor.block, 'execute_sync') as mock_execute_sync:
            executor.execute(block_run_id=block_run.id, pipeline_run_id=pipeline_run.id)
            mock_execute_sync.assert_called_once()

        block_run_dynamic_child_spawn = BlockRun.create(
            block_uuid=f'{block2.uuid}:0',
            pipeline_run_id=pipeline_run.id,
            metrics=dict(dynamic_block_indexes=dict({
                block1.uuid: 0,
            }))
        )
        executor = BlockExecutor(
            pipeline,
            block_run_dynamic_child_spawn.block_uuid,
            execution_partition=pipeline_run.execution_partition,
        )

        self.assertFalse(isinstance(executor.block, DynamicChildController))

        # with patch.object(pipeline, 'get_block', lambda _x: block2):
        with patch.object(block2, 'execute_sync') as mock_execute_sync:
            executor.execute(
                block_run_id=block_run_dynamic_child_spawn.id,
                pipeline_run_id=pipeline_run.id,
            )

            mock_execute_sync.assert_called_once_with(
                analyze_outputs=False,
                block_run_outputs_cache=None,
                dynamic_block_index=None,
                dynamic_block_indexes=dict({
                    block1.uuid: 0,
                }),
                dynamic_block_uuid=None,
                dynamic_upstream_block_uuids=None,
                execution_partition=pipeline_run.execution_partition,
                global_vars=dict(retry=dict(attempts=1), logger=ANY),
                input_from_output=None,
                logger=ANY,
                logging_tags=dict(
                    block_run_id=block_run_dynamic_child_spawn.id,
                    block_type=block2.type,
                    block_uuid=block_run_dynamic_child_spawn.block_uuid,
                    pipeline_run_id=pipeline_run.id,
                    pipeline_uuid=pipeline.uuid,
                ),
                metadata=None,
                run_all_blocks=True,
                runtime_arguments=None,
                store_variables=True,
                update_status=False,
                verify_output=True,
            )

    def test_block_run_for_dynamic_child_block_reduce_output(self):
        block1 = self.blocks[0]
        block2 = self.blocks[1]
        block1.configuration = dict(dynamic=True)
        block2.configuration = dict(reduce_output=True)
        self.pipeline1.add_block(block1)
        self.pipeline1.add_block(block2)

        pipeline_run = PipelineRun.create(
            execution_date=datetime.utcnow(),
            pipeline_schedule_id=0,
            pipeline_uuid=self.pipeline1.uuid,
        )
        block_run = BlockRun.create(
            block_uuid=block2.uuid,
            pipeline_run_id=pipeline_run.id,
        )

        executor = BlockExecutor(
            self.pipeline1,
            block_run.block_uuid,
            execution_partition=pipeline_run.execution_partition,
        )

        self.assertFalse(isinstance(executor.block, DynamicChildController))

        with patch.object(executor.block, 'execute_sync') as mock_execute_sync:
            executor.execute(block_run_id=block_run.id, pipeline_run_id=pipeline_run.id)
            mock_execute_sync.assert_called_once()
