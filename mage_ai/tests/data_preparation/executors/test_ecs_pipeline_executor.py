from unittest.mock import MagicMock, patch

from botocore.exceptions import WaiterError

from mage_ai.data_preparation.executors.ecs_pipeline_executor import EcsPipelineExecutor
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


class EcsPipelineExecutorTest(DBTestCase):
    def setUp(self):
        super().setUp()
        self.pipeline = create_pipeline_with_blocks(
            'test_ecs_pipeline',
            self.repo_path,
        )
        self.pipeline.executor_type = 'ecs'
        self.pipeline.executor_config = {
            'cluster': 'test-cluster',
            'task_definition': 'test-task-def',
            'wait_timeout': 600
        }
        self.executor = EcsPipelineExecutor(self.pipeline)

    @patch('mage_ai.services.aws.ecs.ecs.run_task')
    def test_execute_success(self, mock_run_task):
        """Test successful ECS task execution."""
        mock_run_task.return_value = None

        self.executor.execute(
            pipeline_run_id=123,
            global_vars={'test': 'value'}
        )

        mock_run_task.assert_called_once()
        # Verify the command was constructed correctly
        call_args = mock_run_task.call_args[0]
        self.assertIn('test_ecs_pipeline', call_args[0])

    @patch('mage_ai.services.aws.ecs.ecs.run_task')
    @patch('mage_ai.orchestration.db.models.schedules.PipelineRun.query')
    def test_execute_waiter_error_marks_pipeline_failed(self, mock_query, mock_run_task):
        """Test that WaiterError marks pipeline run as failed."""
        # Setup mocks
        mock_pipeline_run = MagicMock()
        mock_query.get.return_value = mock_pipeline_run
        mock_run_task.side_effect = WaiterError(
            'Waiter TasksStopped failed: Max attempts exceeded',
            'TasksStopped',
            'Max attempts exceeded'
        )

        # Execute and expect WaiterError to be raised
        with self.assertRaises(WaiterError):
            self.executor.execute(pipeline_run_id=123)

        # Verify pipeline run was marked as failed
        mock_pipeline_run.update.assert_called_once_with(
            status=PipelineRun.PipelineRunStatus.FAILED
        )

    @patch('mage_ai.services.aws.ecs.ecs.run_task')
    @patch('mage_ai.orchestration.db.models.schedules.PipelineRun.query')
    def test_execute_generic_error_marks_pipeline_failed(self, mock_query, mock_run_task):
        """Test that generic errors mark pipeline run as failed."""
        # Setup mocks
        mock_pipeline_run = MagicMock()
        mock_query.get.return_value = mock_pipeline_run
        mock_run_task.side_effect = Exception('ECS task failed')

        # Execute and expect Exception to be raised
        with self.assertRaises(Exception):
            self.executor.execute(pipeline_run_id=123)

        # Verify pipeline run was marked as failed
        mock_pipeline_run.update.assert_called_once_with(
            status=PipelineRun.PipelineRunStatus.FAILED
        )

    @patch('mage_ai.services.aws.ecs.ecs.run_task')
    def test_execute_no_pipeline_run_id(self, mock_run_task):
        """Test execution without pipeline_run_id doesn't try to update status."""
        mock_run_task.side_effect = WaiterError(
            'Waiter TasksStopped failed: Max attempts exceeded',
            'TasksStopped',
            'Max attempts exceeded'
        )

        # Execute without pipeline_run_id
        with self.assertRaises(WaiterError):
            self.executor.execute(global_vars={'test': 'value'})

        # Should not try to update pipeline run status
        mock_run_task.assert_called_once()

    @patch('mage_ai.services.aws.ecs.ecs.run_task')
    @patch('mage_ai.orchestration.db.models.schedules.PipelineRun.query')
    def test_execute_pipeline_run_not_found(self, mock_query, mock_run_task):
        """Test execution when pipeline run is not found."""
        # Setup mocks
        mock_query.get.return_value = None
        mock_run_task.side_effect = WaiterError(
            'Waiter TasksStopped failed: Max attempts exceeded',
            'TasksStopped',
            'Max attempts exceeded'
        )

        # Execute and expect WaiterError to be raised
        with self.assertRaises(WaiterError):
            self.executor.execute(pipeline_run_id=123)

        # Should not try to update non-existent pipeline run
        mock_query.get.assert_called_once_with(123)
