import os
from unittest.mock import MagicMock

from mage_ai.data_preparation.executors.block_executor import BlockExecutor
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.tests.base_test import TestCase


class BlockExecutorTest(TestCase):
    def setUp(self):
        self.pipeline = MagicMock()
        self.pipeline.uuid = 'pipeline_uuid'
        self.pipeline.repo_config = MagicMock()
        self.block_uuid = 'block_uuid'
        self.execution_partition = 'partition'
        self.logger_manager = MagicMock()
        self.logger = MagicMock()
        self.block = MagicMock(spec=Block)
        self.block.type = BlockType.DBT

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

    def test_execute(self):
        analyze_outputs = False
        callback_url = 'http://example.com/callback'
        global_vars = {'var1': 'value1'}
        update_status = True

        def on_complete(block_uuid):
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
        dynamic_block_index = 1
        dynamic_block_uuid = 'dynamic_block_uuid'
        dynamic_upstream_block_uuids = ['upstream_block1', 'upstream_block2']

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
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
        )

        self.assertEqual(result, {'result': 'success'})
        self.pipeline.get_block.assert_called_once_with(self.block_uuid, check_template=True)
        self.assertEqual(self.block.template_runtime_configuration, template_runtime_configuration)
        self.block_executor._execute_conditional.assert_called_once_with(
            dynamic_block_index=dynamic_block_index,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
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
            callback_url=callback_url,
            global_vars=global_vars,
            update_status=update_status,
            input_from_output=input_from_output,
            logging_tags={
                'block_type': BlockType.DBT,
                'block_uuid': self.block_uuid,
                'pipeline_uuid': self.pipeline.uuid,
            },
            verify_output=verify_output,
            runtime_arguments=runtime_arguments,
            template_runtime_configuration=template_runtime_configuration,
            dynamic_block_index=dynamic_block_index,
            dynamic_block_uuid=dynamic_block_uuid,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
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
            dynamic_block_index=dynamic_block_index,
            dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
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
            global_vars={},
            logging_tags={},
            pipeline_run=None,
            dynamic_block_index=None,
            dynamic_upstream_block_uuids=None,
        )

        expected_kwargs = dict(
            dynamic_block_index=None,
            dynamic_upstream_block_uuids=None,
            execution_partition=self.execution_partition,
            global_vars={},
            logger=self.logger,
            logging_tags={},
            parent_block=self.block,
            pipeline_run=None,
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
