from unittest.mock import MagicMock, patch

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.sync.git_sync import GitSync
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.orchestration.job_manager import JobType
from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import (
    create_pipeline_run_with_schedule,
    create_pipeline_with_blocks,
    create_pipeline_with_dynamic_blocks,
)


class PipelineSchedulerTests(DBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
        )
        self.dynamic_pipeline = create_pipeline_with_dynamic_blocks(
            'test dynamic pipeline',
            self.repo_path,
        )

    def test_start(self):
        pipeline_run = PipelineRun.create(pipeline_uuid='test_pipeline')
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(scheduler, 'schedule') as mock_schedule:
            scheduler.start(should_schedule=False)
            self.assertEqual(mock_schedule.call_count, 0)
            self.assertEqual(pipeline_run.status, PipelineRun.PipelineRunStatus.RUNNING)

        pipeline_run2 = PipelineRun.create(pipeline_uuid='test_pipeline')
        scheduler2 = PipelineScheduler(pipeline_run=pipeline_run2)
        with patch.object(scheduler2, 'schedule') as mock_schedule2:
            scheduler2.start(should_schedule=True)
            mock_schedule2.assert_called_once()
            self.assertEqual(pipeline_run2.status, PipelineRun.PipelineRunStatus.RUNNING)

    def test_stop(self):
        pipeline_run = PipelineRun.create(pipeline_uuid='test_pipeline')
        block_runs = pipeline_run.block_runs
        for b in block_runs:
            b.update(status=BlockRun.BlockRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        scheduler.stop()
        pipeline_run.refresh()
        block_runs = pipeline_run.block_runs
        for b in block_runs:
            self.assertEqual(b.status, BlockRun.BlockRunStatus.CANCELLED)

    @patch('mage_ai.orchestration.pipeline_scheduler.run_block')
    @patch('mage_ai.orchestration.pipeline_scheduler.job_manager')
    def test_schedule(self, mock_job_manager, mock_run_pipeline):
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline')
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        mock_job_manager.add_job = MagicMock()
        scheduler.schedule()
        # TODO (tommy dang): change to 2 when we resume running heartbeat in pipeline scheduler
        self.assertEqual(mock_job_manager.add_job.call_count, 1)
        for b in pipeline_run.block_runs:
            if b.block_uuid == 'block1':
                self.assertEqual(b.status, BlockRun.BlockRunStatus.QUEUED)
            else:
                self.assertEqual(b.status, BlockRun.BlockRunStatus.INITIAL)

    def test_schedule_all_blocks_completed(self):
        pipeline_run = PipelineRun.create(pipeline_uuid='test_pipeline')
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        for b in pipeline_run.block_runs:
            b.update(status=BlockRun.BlockRunStatus.COMPLETED)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(
            scheduler.notification_sender,
            'send_pipeline_run_success_message'
        ) as mock_send_message:
            scheduler.schedule()
            self.assertEqual(pipeline_run.status, PipelineRun.PipelineRunStatus.COMPLETED)
            self.assertEqual(mock_send_message.call_count, 1)

    def test_schedule_all_blocks_completed_with_failures(self):
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline',
            pipeline_schedule_settings=dict(allow_blocks_to_fail=True),
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        ct = 0
        for b in pipeline_run.block_runs:
            if ct == 0:
                b.update(status=BlockRun.BlockRunStatus.FAILED)
            else:
                b.update(status=BlockRun.BlockRunStatus.UPSTREAM_FAILED)
            ct += 1
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(
            scheduler.notification_sender,
            'send_pipeline_run_failure_message'
        ) as mock_send_message:
            scheduler.schedule()
            self.assertEqual(pipeline_run.status, PipelineRun.PipelineRunStatus.FAILED)
            self.assertEqual(mock_send_message.call_count, 1)

    def test_schedule_with_block_failures(self):
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline',
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        ct = 0
        for b in pipeline_run.block_runs:
            if ct == 0:
                b.update(status=BlockRun.BlockRunStatus.FAILED)
            ct += 1
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(
            scheduler.notification_sender,
            'send_pipeline_run_failure_message'
        ) as mock_send_message:
            scheduler.schedule()
            self.assertEqual(pipeline_run.status, PipelineRun.PipelineRunStatus.FAILED)
            self.assertEqual(mock_send_message.call_count, 1)

    @patch('mage_ai.orchestration.pipeline_scheduler.run_pipeline')
    @patch('mage_ai.orchestration.pipeline_scheduler.job_manager')
    def test_schedule_streaming(self, mock_job_manager, mock_run_pipeline):
        pipeline = create_pipeline_with_blocks(
            'test pipeline 2',
            self.repo_path,
        )
        pipeline.type = PipelineType.STREAMING
        pipeline.save()
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline_2')
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        mock_has_pipeline_run_job = MagicMock()
        mock_job_manager.has_pipeline_run_job = mock_has_pipeline_run_job
        mock_has_pipeline_run_job.return_value = False
        mock_job_manager.add_job = MagicMock()
        scheduler.schedule()
        mock_job_manager.add_job.assert_called_once_with(
            JobType.PIPELINE_RUN,
            pipeline_run.id,
            mock_run_pipeline,
            pipeline_run.id,
            dict(
                env='prod',
                execution_date=None,
                execution_partition=f'{pipeline_run.pipeline_schedule_id}',
                event={},
            ),
            dict(
                pipeline_run_id=pipeline_run.id,
                pipeline_schedule_id=pipeline_run.pipeline_schedule_id,
                pipeline_uuid='test_pipeline_2',
            ),
        )

    def test_on_block_complete(self):
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline')
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(scheduler, 'schedule') as mock_schedule:
            scheduler.on_block_complete('block1')
            mock_schedule.assert_called_once()
            block_run = BlockRun.get(pipeline_run_id=pipeline_run.id, block_uuid='block1')
            self.assertEqual(block_run.status, BlockRun.BlockRunStatus.COMPLETED)

    def test_on_block_failure(self):
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline')
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        scheduler.on_block_failure('block1')
        block_run = BlockRun.get(pipeline_run_id=pipeline_run.id, block_uuid='block1')
        self.assertEqual(block_run.status, BlockRun.BlockRunStatus.FAILED)

    def test_on_block_failure_allow_blocks_to_fail(self):
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline',
            pipeline_schedule_settings=dict(allow_blocks_to_fail=True),
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        scheduler.on_block_failure('block1')
        block_run = BlockRun.get(pipeline_run_id=pipeline_run.id, block_uuid='block1')
        self.assertEqual(block_run.status, BlockRun.BlockRunStatus.FAILED)
        self.assertEqual(pipeline_run.status, PipelineRun.PipelineRunStatus.RUNNING)

    # dynamic block tests
    @patch('mage_ai.orchestration.pipeline_scheduler.run_block')
    @patch('mage_ai.orchestration.pipeline_scheduler.job_manager')
    def test_schedule_for_dynamic_blocks(self, mock_job_manager, mock_run_pipeline):
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_dynamic_pipeline',
            pipeline_schedule_settings=dict(allow_blocks_to_fail=True),
        )
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        scheduler.schedule()
        for b in pipeline_run.block_runs:
            if b.block_uuid == 'block1':
                self.assertEqual(b.status, BlockRun.BlockRunStatus.QUEUED)
                b.update(status=BlockRun.BlockRunStatus.COMPLETED)
            else:
                self.assertEqual(b.status, BlockRun.BlockRunStatus.INITIAL)
        with patch.object(scheduler, 'schedule') as mock_schedule:
            with patch.object(Block, 'output_variables') as mock_block_variables:
                with patch.object(VariableManager, 'get_variable') as mock_variable:
                    mock_block_variables.return_value = ['values', 'metadata']
                    # only mock the metadata
                    mock_variable.return_value = [
                        {
                            'block_uuid': 'for_user_1'
                        },
                        {
                            'block_uuid': 'for_user_2'
                        }
                    ]
                    scheduler.on_block_complete_without_schedule('block1')
                    mock_schedule.assert_not_called()
                    block_run1 = BlockRun.get(
                        pipeline_run_id=pipeline_run.id,
                        block_uuid='block2:for_user_1',
                    )
                    self.assertTrue(block_run1 is not None)
                    block_run2 = BlockRun.get(
                        pipeline_run_id=pipeline_run.id,
                        block_uuid='block2:for_user_2',
                    )
                    self.assertTrue(block_run2 is not None)

        scheduler.schedule()
        for b in pipeline_run.block_runs:
            if b.block_uuid.startswith('block2'):
                self.assertEqual(b.status, BlockRun.BlockRunStatus.QUEUED)

    @patch('mage_ai.orchestration.pipeline_scheduler.run_block')
    @patch('mage_ai.orchestration.pipeline_scheduler.job_manager')
    def test_schedule_for_dynamic_blocks_allow_blocks_to_fail(
        self,
        mock_job_manager,
        mock_run_pipeline,
    ):
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_dynamic_pipeline',
            pipeline_schedule_settings=dict(allow_blocks_to_fail=True),
        )
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        scheduler.schedule()
        for b in pipeline_run.block_runs:
            if b.block_uuid == 'block1':
                self.assertEqual(b.status, BlockRun.BlockRunStatus.QUEUED)
                b.update(status=BlockRun.BlockRunStatus.COMPLETED)
            else:
                self.assertEqual(b.status, BlockRun.BlockRunStatus.INITIAL)
        with patch.object(scheduler, 'schedule') as mock_schedule:
            with patch.object(Block, 'output_variables') as mock_block_variables:
                with patch.object(VariableManager, 'get_variable') as mock_variable:
                    mock_block_variables.return_value = ['values', 'metadata']
                    # only mock the metadata
                    mock_variable.return_value = [
                        {
                            'block_uuid': 'for_user_1'
                        },
                        {
                            'block_uuid': 'for_user_2'
                        }
                    ]
                    scheduler.on_block_complete_without_schedule('block1')
                    mock_schedule.assert_not_called()
                    block_run1 = BlockRun.get(
                        pipeline_run_id=pipeline_run.id,
                        block_uuid='block2:for_user_1',
                    )
                    self.assertTrue(block_run1 is not None)
                    block_run2 = BlockRun.get(
                        pipeline_run_id=pipeline_run.id,
                        block_uuid='block2:for_user_2',
                    )
                    self.assertTrue(block_run2 is not None)

        scheduler.schedule()
        for b in pipeline_run.block_runs:
            if b.block_uuid.startswith('block2'):
                self.assertEqual(b.status, BlockRun.BlockRunStatus.QUEUED)

    def test_on_block_complete_dynamic_blocks(self):
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_dynamic_pipeline',
            pipeline_schedule_settings=dict(allow_blocks_to_fail=True),
        )
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(scheduler, 'schedule') as mock_schedule:
            with patch.object(Block, 'output_variables') as mock_block_variables:
                with patch.object(VariableManager, 'get_variable') as mock_variable:
                    mock_block_variables.return_value = ['values', 'metadata']
                    # only mock the metadata
                    mock_variable.return_value = [
                        {
                            'block_uuid': 'for_user_1'
                        },
                        {
                            'block_uuid': 'for_user_2'
                        }
                    ]
                    scheduler.on_block_complete_without_schedule('block1')
                    mock_schedule.assert_not_called()
                    block_run1 = BlockRun.get(
                        pipeline_run_id=pipeline_run.id,
                        block_uuid='block2:for_user_1',
                    )
                    self.assertTrue(block_run1 is not None)
                    block_run2 = BlockRun.get(
                        pipeline_run_id=pipeline_run.id,
                        block_uuid='block2:for_user_2',
                    )
                    self.assertTrue(block_run2 is not None)

    def test_sync_data_on_pipeline_run(self):
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_dynamic_pipeline',
            pipeline_schedule_settings=dict(allow_blocks_to_fail=True),
        )
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        preferences = get_preferences(repo_path=self.repo_path)
        preferences.update_preferences(
            dict(sync_config=dict(
                remote_repo_link='test_git_repo',
                repo_path=self.repo_path,
                branch='main',
                sync_on_pipeline_run=True,
            )))
        with patch.object(GitSync, 'sync_data') as mock_sync:
            scheduler.start(should_schedule=False)
            mock_sync.assert_called_once()
