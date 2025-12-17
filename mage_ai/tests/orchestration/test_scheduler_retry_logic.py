from unittest.mock import MagicMock, patch

from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.orchestration.pipeline_scheduler_project_platform import PipelineScheduler
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


class SchedulerRetryLogicTest(DBTestCase):
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
        self.scheduler = PipelineScheduler(pipeline_run=self.pipeline_run)

    def test_fetch_crashed_block_runs_with_retry_config_retries_zero(self):
        """Test that blocks with retries=0 are marked as permanently failed."""
        # Create a block run with retries=0
        block_run = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='test_block',
            status=BlockRun.BlockRunStatus.RUNNING,
        )

        # Set repo retry config to retries=0
        self.pipeline.repo_config.retry_config = {'retries': 0, 'delay': 5}

        # Mock the job manager to return False (job not active)
        with patch('mage_ai.orchestration.pipeline_scheduler_project_platform.get_job_manager') as mock_get_job_manager:
            mock_job_manager = MagicMock()
            mock_job_manager.has_block_run_job.return_value = False
            mock_get_job_manager.return_value = mock_job_manager

            # Call the method
            crashed_runs = self.scheduler._PipelineScheduler__fetch_crashed_block_runs()

        # Verify block run was marked as permanently failed
        block_run.refresh()
        self.assertEqual(block_run.status, BlockRun.BlockRunStatus.FAILED)
        self.assertEqual(len(crashed_runs), 0)  # No crashed runs to retry

    def test_fetch_crashed_block_runs_with_retry_config_retries_positive(self):
        """Test that blocks with retries>0 are reset to INITIAL for retry."""
        # Create a block run with retries>0
        block_run = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='test_block',
            status=BlockRun.BlockRunStatus.RUNNING,
        )

        # Set repo retry config to retries=3
        self.pipeline.repo_config.retry_config = {'retries': 3, 'delay': 5}

        # Mock the job manager to return False (job not active)
        with patch('mage_ai.orchestration.pipeline_scheduler_project_platform.get_job_manager') as mock_get_job_manager:
            mock_job_manager = MagicMock()
            mock_job_manager.has_block_run_job.return_value = False
            mock_get_job_manager.return_value = mock_job_manager

            # Call the method
            crashed_runs = self.scheduler._PipelineScheduler__fetch_crashed_block_runs()

        # Verify block run was reset to INITIAL for retry
        block_run.refresh()
        self.assertEqual(block_run.status, BlockRun.BlockRunStatus.INITIAL)
        self.assertEqual(len(crashed_runs), 1)
        self.assertEqual(crashed_runs[0].id, block_run.id)

    def test_fetch_crashed_block_runs_with_block_retry_config(self):
        """Test that block-level retry config takes precedence over repo retry config."""
        # Create a block run
        block_run = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='test_block',
            status=BlockRun.BlockRunStatus.RUNNING,
        )

        # Set repo retry config to retries=3
        self.pipeline.repo_config.retry_config = {'retries': 3, 'delay': 5}

        # Set block retry config to retries=0
        block = self.pipeline.get_block('test_block')
        if block:
            block.retry_config = {'retries': 0, 'delay': 5}

        # Mock the job manager to return False (job not active)
        with patch('mage_ai.orchestration.pipeline_scheduler_project_platform.get_job_manager') as mock_get_job_manager:
            mock_job_manager = MagicMock()
            mock_job_manager.has_block_run_job.return_value = False
            mock_get_job_manager.return_value = mock_job_manager

            # Call the method
            crashed_runs = self.scheduler._PipelineScheduler__fetch_crashed_block_runs()

        # Verify block run was marked as permanently failed (block config takes precedence)
        block_run.refresh()
        self.assertEqual(block_run.status, BlockRun.BlockRunStatus.FAILED)
        self.assertEqual(len(crashed_runs), 0)

    def test_fetch_crashed_block_runs_with_repo_retry_config(self):
        """Test that repo retry config is used when pipeline and block configs are not set."""
        # Create a block run
        block_run = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='test_block',
            status=BlockRun.BlockRunStatus.RUNNING,
        )

        # Set repo retry config to retries=0
        self.pipeline.repo_config.retry_config = {'retries': 0, 'delay': 5}

        # Mock the job manager to return False (job not active)
        with patch('mage_ai.orchestration.pipeline_scheduler_project_platform.get_job_manager') as mock_get_job_manager:
            mock_job_manager = MagicMock()
            mock_job_manager.has_block_run_job.return_value = False
            mock_get_job_manager.return_value = mock_job_manager

            # Call the method
            crashed_runs = self.scheduler._PipelineScheduler__fetch_crashed_block_runs()

        # Verify block run was marked as permanently failed
        block_run.refresh()
        self.assertEqual(block_run.status, BlockRun.BlockRunStatus.FAILED)
        self.assertEqual(len(crashed_runs), 0)

    def test_fetch_crashed_block_runs_no_retry_config(self):
        """Test that blocks with no retry config are marked as permanently failed."""
        # Create a block run
        block_run = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='test_block',
            status=BlockRun.BlockRunStatus.RUNNING,
        )

        # No retry config set

        # Mock the job manager to return False (job not active)
        with patch('mage_ai.orchestration.pipeline_scheduler_project_platform.get_job_manager') as mock_get_job_manager:
            mock_job_manager = MagicMock()
            mock_job_manager.has_block_run_job.return_value = False
            mock_get_job_manager.return_value = mock_job_manager

            # Call the method
            crashed_runs = self.scheduler._PipelineScheduler__fetch_crashed_block_runs()

        # Verify block run was marked as permanently failed
        block_run.refresh()
        self.assertEqual(block_run.status, BlockRun.BlockRunStatus.FAILED)
        self.assertEqual(len(crashed_runs), 0)

    def test_fetch_crashed_block_runs_job_still_active(self):
        """Test that blocks with active jobs are not affected."""
        # Create a block run
        block_run = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='test_block',
            status=BlockRun.BlockRunStatus.RUNNING,
        )

        # Set retry config to retries=3
        self.pipeline.retry_config = {'retries': 3, 'delay': 5}

        # Mock the job manager to return True (job still active)
        with patch('mage_ai.orchestration.pipeline_scheduler_project_platform.get_job_manager') as mock_get_job_manager:
            mock_job_manager = MagicMock()
            mock_job_manager.has_block_run_job.return_value = True
            mock_get_job_manager.return_value = mock_job_manager

            # Call the method
            crashed_runs = self.scheduler._PipelineScheduler__fetch_crashed_block_runs()

        # Verify block run status was not changed
        block_run.refresh()
        self.assertEqual(block_run.status, BlockRun.BlockRunStatus.RUNNING)
        self.assertEqual(len(crashed_runs), 0)

    def test_fetch_crashed_block_runs_only_running_queued_blocks(self):
        """Test that only RUNNING and QUEUED blocks are processed."""
        # Create block runs with different statuses
        running_block = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='running_block',
            status=BlockRun.BlockRunStatus.RUNNING,
        )
        queued_block = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='queued_block',
            status=BlockRun.BlockRunStatus.QUEUED,
        )
        completed_block = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='completed_block',
            status=BlockRun.BlockRunStatus.COMPLETED,
        )
        failed_block = BlockRun.create(
            pipeline_run_id=self.pipeline_run.id,
            block_uuid='failed_block',
            status=BlockRun.BlockRunStatus.FAILED,
        )

        # Set retry config to retries=0
        self.pipeline.retry_config = {'retries': 0, 'delay': 5}

        # Mock the job manager to return False for all
        with patch('mage_ai.orchestration.pipeline_scheduler_project_platform.get_job_manager') as mock_get_job_manager:
            mock_job_manager = MagicMock()
            mock_job_manager.has_block_run_job.return_value = False
            mock_get_job_manager.return_value = mock_job_manager

            # Call the method
            crashed_runs = self.scheduler._PipelineScheduler__fetch_crashed_block_runs()

        # Verify only RUNNING and QUEUED blocks were processed
        running_block.refresh()
        queued_block.refresh()
        completed_block.refresh()
        failed_block.refresh()

        self.assertEqual(running_block.status, BlockRun.BlockRunStatus.FAILED)
        self.assertEqual(queued_block.status, BlockRun.BlockRunStatus.FAILED)
        self.assertEqual(completed_block.status, BlockRun.BlockRunStatus.COMPLETED)  # Unchanged
        self.assertEqual(failed_block.status, BlockRun.BlockRunStatus.FAILED)  # Unchanged
        self.assertEqual(len(crashed_runs), 0)  # No retries
