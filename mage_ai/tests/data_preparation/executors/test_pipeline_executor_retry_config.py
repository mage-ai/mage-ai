import asyncio
from unittest.mock import MagicMock, patch

from mage_ai.data_preparation.executors.pipeline_executor import PipelineExecutor
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


class PipelineExecutorRetryConfigTest(DBTestCase):
    def setUp(self):
        super().setUp()
        self.pipeline = create_pipeline_with_blocks(
            'test_retry_pipeline',
            self.repo_path,
        )
        self.pipeline_run = PipelineRun.create(
            pipeline_uuid=self.pipeline.uuid,
            execution_date=None,
        )
        self.executor = PipelineExecutor(self.pipeline)

    @patch('mage_ai.data_preparation.executors.pipeline_executor.BlockExecutor')
    @patch('asyncio.run')
    def test_execute_passes_block_retry_config_to_block_executor(self, mock_asyncio_run, mock_block_executor_class):
        """Test that block retry_config is passed to BlockExecutor."""
        # Setup
        mock_block_executor = MagicMock()
        mock_block_executor_class.return_value = mock_block_executor

        # Set block retry config
        block = self.pipeline.get_block('test_block')
        if block:
            block.retry_config = {'retries': 3, 'delay': 5}

        # Create a block run
        block_run = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='test_block',
            status=BlockRun.BlockRunStatus.INITIAL,
        )

        # Mock the async execution to call the actual async function
        def mock_run(async_func):
            # Create a mock loop and run the async function
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(async_func())
            finally:
                loop.close()
        
        mock_asyncio_run.side_effect = mock_run

        # Execute
        self.executor.execute(pipeline_run_id=self.pipeline_run.id)

        # Verify BlockExecutor was called with retry_config
        mock_block_executor.execute.assert_called_once()
        call_kwargs = mock_block_executor.execute.call_args[1]
        self.assertEqual(call_kwargs['retry_config'], {'retries': 3, 'delay': 5})

    @patch('mage_ai.data_preparation.executors.pipeline_executor.BlockExecutor')
    @patch('asyncio.run')
    def test_execute_uses_none_when_no_block_retry_config(self, mock_asyncio_run, mock_block_executor_class):
        """Test that None is passed when block has no retry_config."""
        # Setup
        mock_block_executor = MagicMock()
        mock_block_executor_class.return_value = mock_block_executor

        # No block retry config set

        # Create a block run
        block_run = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='test_block',
            status=BlockRun.BlockRunStatus.INITIAL,
        )

        # Mock the async execution to call the actual async function
        def mock_run(async_func):
            # Create a mock loop and run the async function
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(async_func())
            finally:
                loop.close()
        
        mock_asyncio_run.side_effect = mock_run

        # Execute
        self.executor.execute(pipeline_run_id=self.pipeline_run.id)

        # Verify BlockExecutor was called with None retry_config
        mock_block_executor.execute.assert_called_once()
        call_kwargs = mock_block_executor.execute.call_args[1]
        self.assertIsNone(call_kwargs['retry_config'])

    @patch('mage_ai.data_preparation.executors.pipeline_executor.BlockExecutor')
    @patch('asyncio.run')
    def test_execute_uses_none_when_block_config_none(self, mock_asyncio_run, mock_block_executor_class):
        """Test that None is used when block retry_config is None."""
        # Setup
        mock_block_executor = MagicMock()
        mock_block_executor_class.return_value = mock_block_executor

        # Set block retry config to None
        block = self.pipeline.get_block('test_block')
        if block:
            block.retry_config = None

        # Create a block run
        block_run = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='test_block',
            status=BlockRun.BlockRunStatus.INITIAL,
        )

        # Mock the async execution to call the actual async function
        def mock_run(async_func):
            # Create a mock loop and run the async function
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(async_func())
            finally:
                loop.close()
        
        mock_asyncio_run.side_effect = mock_run

        # Execute
        self.executor.execute(pipeline_run_id=self.pipeline_run.id)

        # Verify BlockExecutor was called with None retry_config
        mock_block_executor.execute.assert_called_once()
        call_kwargs = mock_block_executor.execute.call_args[1]
        self.assertIsNone(call_kwargs['retry_config'])

    @patch('mage_ai.data_preparation.executors.pipeline_executor.BlockExecutor')
    @patch('asyncio.run')
    def test_execute_uses_none_when_no_retry_config(self, mock_asyncio_run, mock_block_executor_class):
        """Test that None is used when no retry config is set."""
        # Setup
        mock_block_executor = MagicMock()
        mock_block_executor_class.return_value = mock_block_executor

        # No retry config set

        # Create a block run
        block_run = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='test_block',
            status=BlockRun.BlockRunStatus.INITIAL,
        )

        # Mock the async execution to call the actual async function
        def mock_run(async_func):
            # Create a mock loop and run the async function
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(async_func())
            finally:
                loop.close()
        
        mock_asyncio_run.side_effect = mock_run

        # Execute
        self.executor.execute(pipeline_run_id=self.pipeline_run.id)

        # Verify BlockExecutor was called with None retry_config
        mock_block_executor.execute.assert_called_once()
        call_kwargs = mock_block_executor.execute.call_args[1]
        self.assertIsNone(call_kwargs['retry_config'])
