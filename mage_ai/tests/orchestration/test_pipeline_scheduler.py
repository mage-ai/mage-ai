from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.orchestration.db.models import BlockRun, PipelineRun
from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import (
    create_pipeline_run_with_schedule,
    create_pipeline_with_blocks,
)
from unittest.mock import MagicMock, patch


class PipelineSchedulerTests(DBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
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
    @patch('mage_ai.orchestration.pipeline_scheduler.create_process')
    def test_schedule(self, mock_create_process, mock_run_pipeline):
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline')
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        mock_proc = MagicMock()
        mock_create_process.return_value = mock_proc
        scheduler.schedule()
        # TODO (tommy dang): change to 2 when we resume running heartbeat in pipeline scheduler
        self.assertEqual(mock_create_process.call_count, 1)
        for b in pipeline_run.block_runs:
            if b.block_uuid == 'block1':
                self.assertEqual(b.status, BlockRun.BlockRunStatus.RUNNING)
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

    @patch('mage_ai.orchestration.pipeline_scheduler.run_pipeline')
    @patch('mage_ai.orchestration.pipeline_scheduler.create_process')
    def test_schedule_streaming(self, mock_create_process, mock_run_pipeline):
        pipeline = create_pipeline_with_blocks(
            'test pipeline 2',
            self.repo_path,
        )
        pipeline.type = PipelineType.STREAMING
        pipeline.save()
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline_2')
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        mock_proc = MagicMock()
        mock_proc_start = MagicMock()
        mock_proc.start = mock_proc_start
        mock_create_process.return_value = mock_proc
        scheduler.schedule()
        mock_create_process.assert_called_once_with(
            mock_run_pipeline,
            (
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
            ),
        )
        mock_proc_start.assert_called_once()

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
        with patch.object(
            scheduler.notification_sender,
            'send_pipeline_run_failure_message'
        ) as mock_send_message:
            scheduler.on_block_failure('block1')
            mock_send_message.assert_called_once()
            block_run = BlockRun.get(pipeline_run_id=pipeline_run.id, block_uuid='block1')
            self.assertEqual(block_run.status, BlockRun.BlockRunStatus.FAILED)
            self.assertEqual(pipeline_run.status, PipelineRun.PipelineRunStatus.FAILED)
