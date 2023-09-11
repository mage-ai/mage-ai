from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytz
from freezegun import freeze_time

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
)
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.data_preparation.variable_manager import VariableManager
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.orchestration.job_manager import JobType
from mage_ai.orchestration.notification.sender import NotificationSender
from mage_ai.orchestration.pipeline_scheduler import (
    PipelineScheduler,
    check_sla,
    schedule_all,
)
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
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

    @freeze_time('2023-10-11 12:13:14')
    def test_schedule_all_for_pipeline_schedules_with_landing_time(self):
        def new_schedule(self):
            print(f'Mock PipelineScheduler().schedule() for pipeline run {self.pipeline_run.id}.')

        shared_attrs = dict(
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.HOURLY,
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
            status=ScheduleStatus.ACTIVE,
        )

        pipeline_schedule = PipelineSchedule.create(**merge_dict(shared_attrs, dict(
            start_time=datetime(2023, 10, 10, 13, 13, 20),
        )))

        # No previous pipeline runs
        self.assertEqual(len((
            PipelineRun.
            query.
            filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
                PipelineRun.status == PipelineRun.PipelineRunStatus.RUNNING,
            ).
            all()
        )), 0)

        with patch.object(PipelineScheduler, 'schedule', new_schedule):
            schedule_all()

        self.assertEqual(len((
            PipelineRun.
            query.
            filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
                PipelineRun.status == PipelineRun.PipelineRunStatus.RUNNING,
            ).
            all()
        )), 1)

    @freeze_time('2023-10-11 12:13:14')
    def test_schedule_all_for_pipeline_schedules_with_landing_time_with_previous_runs(self):
        def new_schedule(self):
            print(f'Mock PipelineScheduler().schedule() for pipeline run {self.pipeline_run.id}.')

        shared_attrs = dict(
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.HOURLY,
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
            status=ScheduleStatus.ACTIVE,
        )

        pipeline_schedule = PipelineSchedule.create(**merge_dict(shared_attrs, dict(
            start_time=datetime(2023, 10, 10, 13, 13, 20),
        )))

        # No previous pipeline runs
        self.assertEqual(len((
            PipelineRun.
            query.
            filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
                PipelineRun.status == PipelineRun.PipelineRunStatus.RUNNING,
            ).
            all()
        )), 0)

        # With previous pipeline runs
        PipelineRun.create(
            execution_date=datetime(2023, 10, 30, 0, 0, 0),
            metrics=dict(previous_runtimes=[100, 200, 300, 400, 500, 600, 700]),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.FAILED,
            variables=pipeline_schedule.variables,
        )
        pipeline_run = PipelineRun.create(
            completed_at=datetime(2023, 10, 11, 12, 13, 15),
            execution_date=datetime(2023, 10, 20, 0, 0, 0),
            metrics=dict(previous_runtimes=[2, 3, 4, 5, 6, 7, 8]),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
            variables=pipeline_schedule.variables,
        )
        pipeline_run.update(created_at=datetime(2023, 10, 11, 12, 13, 14))
        PipelineRun.create(
            execution_date=datetime(2023, 10, 10, 0, 0, 0),
            metrics=dict(previous_runtimes=[10, 20, 30, 40, 50, 60, 70]),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
            variables=pipeline_schedule.variables,
        )

        with patch.object(PipelineScheduler, 'schedule', new_schedule):
            schedule_all()

        self.assertEqual(len((
            PipelineRun.
            query.
            filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
                PipelineRun.status == PipelineRun.PipelineRunStatus.RUNNING,
            ).
            all()
        )), 1)

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

    @freeze_time('2023-05-01 01:20:33')
    def test_send_sla_message(self):
        pipeline = create_pipeline_with_blocks(
            'test sla pipeline',
            self.repo_path,
        )
        pipeline_uuid = pipeline.uuid
        pipeline_schedule = PipelineSchedule.create(
            name='test_sla_pipeline_trigger',
            pipeline_uuid=pipeline_uuid,
            sla=600,
        )
        pipeline_schedule.update(
            status=ScheduleStatus.ACTIVE,
        )
        now_time = datetime(2023, 5, 1, 1, 20, 33, tzinfo=pytz.utc).astimezone()
        pipeline_run = create_pipeline_run_with_schedule(
            execution_date=now_time - timedelta(seconds=601),
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        pipeline_run2 = create_pipeline_run_with_schedule(
            execution_date=now_time - timedelta(seconds=599),
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
        )
        pipeline_run2.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        pipeline_run3 = create_pipeline_run_with_schedule(
            execution_date=now_time - timedelta(seconds=1),
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
        )
        pipeline_run3.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        with patch.object(
            NotificationSender,
            'send_pipeline_run_sla_passed_message'
        ) as mock_send_message:
            check_sla()
            mock_send_message.assert_called_once()

    @freeze_time('2023-05-01 01:20:33')
    @patch('mage_ai.orchestration.utils.git.GitSync')
    def test_sync_data_on_schedule_all(self, mock_git_sync):
        git_sync_instance = MagicMock()
        mock_git_sync.return_value = git_sync_instance
        pipeline = create_pipeline_with_blocks(
            'test git sync pipeline',
            self.repo_path,
        )
        PipelineSchedule.create(
            name='test_sla_pipeline_trigger_1',
            pipeline_uuid=pipeline.uuid,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 1, 1, 20, 33),
            schedule_interval='@hourly',
        )
        PipelineSchedule.create(
            name='test_sla_pipeline_trigger_2',
            pipeline_uuid=pipeline.uuid,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 5, 1, 20, 33),
            schedule_interval='@hourly',
        )
        preferences = get_preferences(repo_path=self.repo_path)
        preferences.update_preferences(
            dict(sync_config=dict(
                remote_repo_link='test_git_repo',
                repo_path=self.repo_path,
                branch='main',
                sync_on_pipeline_run=True,
            )))
        with patch.object(PipelineScheduler, 'schedule') as _:
            schedule_all()
            git_sync_instance.sync_data.assert_called_once()

    @freeze_time('2023-05-01 01:20:33')
    @patch('mage_ai.orchestration.pipeline_scheduler.job_manager')
    def test_pipeline_run_timeout(self, mock_job_manager):
        mock_job_manager.add_job = MagicMock()
        pipeline = create_pipeline_with_blocks(
            'test pipeline run timeout pipeline',
            self.repo_path,
        )
        pipeline_uuid = pipeline.uuid
        pipeline_schedule = PipelineSchedule.create(
            name='test_timeout_pipeline_trigger',
            pipeline_uuid=pipeline_uuid,
            settings=dict(timeout=600),
        )
        pipeline_schedule.update(
            status=ScheduleStatus.ACTIVE,
        )
        now_time = datetime(2023, 5, 1, 1, 20, 33, tzinfo=pytz.utc).astimezone()
        pipeline_run = create_pipeline_run_with_schedule(
            execution_date=now_time - timedelta(seconds=601),
            started_at=now_time - timedelta(seconds=601),
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        pipeline_run2 = create_pipeline_run_with_schedule(
            execution_date=now_time - timedelta(seconds=599),
            started_at=now_time - timedelta(seconds=599),
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
        )
        pipeline_run2.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        pipeline_run3 = create_pipeline_run_with_schedule(
            execution_date=now_time - timedelta(seconds=1),
            started_at=now_time - timedelta(seconds=1),
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
        )
        pipeline_run3.update(status=PipelineRun.PipelineRunStatus.RUNNING)

        PipelineScheduler(pipeline_run=pipeline_run).schedule()
        PipelineScheduler(pipeline_run=pipeline_run2).schedule()
        PipelineScheduler(pipeline_run=pipeline_run3).schedule()
        self.assertEqual(pipeline_run.status, PipelineRun.PipelineRunStatus.FAILED)
        self.assertEqual(pipeline_run2.status, PipelineRun.PipelineRunStatus.RUNNING)
        self.assertEqual(pipeline_run3.status, PipelineRun.PipelineRunStatus.RUNNING)

    @freeze_time('2023-05-01 01:20:33')
    @patch('mage_ai.orchestration.pipeline_scheduler.job_manager')
    def test_block_run_timeout(self, mock_job_manager):
        mock_job_manager.add_job = MagicMock()
        pipeline = create_pipeline_with_blocks(
            'test block run timeout pipeline',
            self.repo_path,
        )
        pipeline_uuid = pipeline.uuid
        pipeline_schedule = PipelineSchedule.create(
            name='test_block_timeout_pipeline_trigger',
            pipeline_uuid=pipeline_uuid,
        )

        block = pipeline.get_block('block1')
        block.update(data=dict(timeout=600))

        pipeline_schedule.update(
            status=ScheduleStatus.ACTIVE,
        )
        now_time = datetime(2023, 5, 1, 1, 20, 33, tzinfo=pytz.utc).astimezone()
        pipeline_run = create_pipeline_run_with_schedule(
            execution_date=now_time - timedelta(seconds=601),
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
        )
        block_run = find(lambda br: br.block_uuid == 'block1', pipeline_run.block_runs)
        block_run.update(
            status=BlockRun.BlockRunStatus.RUNNING,
            started_at=now_time - timedelta(seconds=601),
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        pipeline_run2 = create_pipeline_run_with_schedule(
            execution_date=now_time - timedelta(seconds=599),
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
        )
        block_run2 = find(lambda br: br.block_uuid == 'block1', pipeline_run2.block_runs)
        block_run2.update(
            status=BlockRun.BlockRunStatus.RUNNING,
            started_at=now_time - timedelta(seconds=599),
        )
        pipeline_run2.update(status=PipelineRun.PipelineRunStatus.RUNNING)

        PipelineScheduler(pipeline_run=pipeline_run).schedule()
        PipelineScheduler(pipeline_run=pipeline_run2).schedule()
        self.assertEqual(block_run.status, BlockRun.BlockRunStatus.FAILED)
        self.assertEqual(block_run2.status, BlockRun.BlockRunStatus.RUNNING)
