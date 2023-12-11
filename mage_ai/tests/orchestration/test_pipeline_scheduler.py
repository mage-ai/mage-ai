from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytz
import yaml
from freezegun import freeze_time

from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
)
from mage_ai.data_preparation.preferences import get_preferences
from mage_ai.orchestration.backfills.service import start_backfill
from mage_ai.orchestration.db.models.schedules import (
    Backfill,
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.orchestration.job_manager import JobManager, JobType
from mage_ai.orchestration.notification.sender import NotificationSender
from mage_ai.orchestration.pipeline_scheduler import (
    PipelineScheduler,
    check_sla,
    schedule_all,
)
from mage_ai.shared.array import find
from mage_ai.shared.hash import ignore_keys, merge_dict
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import (
    create_backfill,
    create_integration_pipeline_with_blocks,
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
        self.integration_pipeline = create_integration_pipeline_with_blocks(
            'test integration pipeline',
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
            self.assertEqual(
                pipeline_run2.status, PipelineRun.PipelineRunStatus.RUNNING
            )

    def test_start_with_exception(self):
        # Not create block runs at the beginning
        pipeline_run = PipelineRun.create(
            pipeline_uuid='test_pipeline', create_block_runs=False
        )
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(scheduler, 'schedule') as mock_schedule:
            with patch.object(
                pipeline_run, 'create_block_runs'
            ) as mock_create_block_runs:
                with patch.object(
                    scheduler.notification_sender, 'send_pipeline_run_failure_message'
                ) as mock_send_message:
                    mock_create_block_runs.side_effect = Exception()
                    scheduler.start()
                    self.assertEqual(
                        pipeline_run.status, PipelineRun.PipelineRunStatus.FAILED
                    )
                    mock_send_message.assert_called_once_with(
                        error='Fail to initialize block runs.',
                        pipeline=scheduler.pipeline,
                        pipeline_run=pipeline_run,
                    )
                    self.assertEqual(mock_schedule.call_count, 0)

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
            scheduler.notification_sender, 'send_pipeline_run_success_message'
        ) as mock_send_message:
            scheduler.schedule()
            self.assertEqual(
                pipeline_run.status, PipelineRun.PipelineRunStatus.COMPLETED
            )
            mock_send_message.assert_called_once_with(
                pipeline=scheduler.pipeline,
                pipeline_run=pipeline_run,
            )

    @freeze_time('2023-11-11 12:30:00')
    def test_backfill_status_with_completed_pipeline_run(self):
        pipeline_schedule = PipelineSchedule.create(
            name='test_pipeline_trigger',
            pipeline_uuid='test_pipeline',
        )
        backfill = create_backfill(
            'test_pipeline',
            end_datetime=datetime.today(),
            pipeline_schedule_id=pipeline_schedule.id,
            start_datetime=datetime.today(),
        )
        pipeline_runs = start_backfill(backfill)
        pipeline_run = pipeline_runs[0]
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(JobManager, 'add_job') as mock_add_br_job:
            scheduler.schedule()
            self.assertEqual(
                backfill.status,
                Backfill.Status.RUNNING,
            )
            mock_add_br_job.assert_called()

            for b in pipeline_run.block_runs:
                b.update(status=BlockRun.BlockRunStatus.COMPLETED)
            scheduler.schedule()
            self.assertEqual(
                backfill.status,
                Backfill.Status.COMPLETED,
            )

    @freeze_time('2023-11-11 12:30:00')
    def test_backfill_status_with_failed_pipeline_run(self):
        pipeline_schedule = PipelineSchedule.create(
            name='test_pipeline_trigger',
            pipeline_uuid='test_pipeline',
        )
        backfill = create_backfill(
            'test_pipeline',
            end_datetime=datetime.today(),
            pipeline_schedule_id=pipeline_schedule.id,
            start_datetime=datetime.today(),
        )
        pipeline_runs = start_backfill(backfill)
        pipeline_run = pipeline_runs[0]
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)

        for b in pipeline_run.block_runs:
            b.update(status=BlockRun.BlockRunStatus.FAILED)
        scheduler.schedule()
        # Backfill with 1 pipeline run that fails
        self.assertEqual(
            backfill.status,
            Backfill.Status.FAILED,
        )

        # Retry failed pipeline run that was associated with the existing backfill
        retried_pipeline_run = create_pipeline_run_with_schedule(
            'test_pipeline',
            execution_date=pipeline_run.execution_date,
            pipeline_schedule_id=pipeline_schedule.id,
        )
        scheduler2 = PipelineScheduler(pipeline_run=retried_pipeline_run)
        backfill.update(status=Backfill.Status.INITIAL)
        self.assertEqual(
            backfill.status,
            Backfill.Status.INITIAL,
        )
        # Retried pipeline run successfully completes, so backfill status updates to "completed"
        for b in retried_pipeline_run.block_runs:
            b.update(status=BlockRun.BlockRunStatus.COMPLETED)
        scheduler2.schedule()
        self.assertEqual(
            backfill.status,
            Backfill.Status.COMPLETED,
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_schedule_all_with_integration_pipeline(self):
        integration_pipeline_schedule = PipelineSchedule.create(
            name='integration trigger',
            pipeline_uuid='test_integration_pipeline',
            schedule_interval=ScheduleInterval.HOURLY,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 10, 10, 13, 13, 20),
        )
        pipeline_schedule = PipelineSchedule.create(
            name='standard trigger',
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.HOURLY,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 10, 10, 13, 13, 20),
        )
        with patch.object(PipelineScheduler, 'schedule') as _:
            schedule_all()

        self.assertEqual(1, integration_pipeline_schedule.pipeline_runs_count)
        self.assertEqual(
            PipelineRun.PipelineRunStatus.RUNNING,
            integration_pipeline_schedule.pipeline_runs[0].status,
        )
        self.assertEqual(1, pipeline_schedule.pipeline_runs_count)
        self.assertEqual(
            PipelineRun.PipelineRunStatus.RUNNING,
            pipeline_schedule.pipeline_runs[0].status,
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_schedule_all_for_pipeline_schedules_with_landing_time(self):
        def new_schedule(self):
            print(
                f'Mock PipelineScheduler().schedule() for pipeline run {self.pipeline_run.id}.'
            )

        shared_attrs = dict(
            name='trigger',
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.HOURLY,
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
            status=ScheduleStatus.ACTIVE,
        )

        pipeline_schedule = PipelineSchedule.create(
            **merge_dict(
                shared_attrs,
                dict(
                    start_time=datetime(2023, 10, 10, 13, 13, 20),
                ),
            )
        )

        # No previous pipeline runs
        self.assertEqual(
            PipelineRun.query.filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
                PipelineRun.status == PipelineRun.PipelineRunStatus.RUNNING,
            ).count(),
            0,
        )

        with patch.object(PipelineScheduler, 'schedule', new_schedule):
            schedule_all()

        self.assertEqual(
            PipelineRun.query.filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
                PipelineRun.status == PipelineRun.PipelineRunStatus.RUNNING,
            ).count(),
            1,
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_schedule_all_for_pipeline_schedules_with_landing_time_with_previous_runs(
        self,
    ):
        def new_schedule(self):
            print(
                f'Mock PipelineScheduler().schedule() for pipeline run {self.pipeline_run.id}.'
            )

        shared_attrs = dict(
            name='trigger',
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.HOURLY,
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
            status=ScheduleStatus.ACTIVE,
        )

        pipeline_schedule = PipelineSchedule.create(
            **merge_dict(
                shared_attrs,
                dict(
                    start_time=datetime(2023, 10, 10, 13, 13, 20),
                ),
            )
        )

        # No previous pipeline runs
        self.assertEqual(
            PipelineRun.query.filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
                PipelineRun.status == PipelineRun.PipelineRunStatus.RUNNING,
            ).count(),
            0,
        )

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

        self.assertEqual(
            PipelineRun.query.filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
                PipelineRun.status == PipelineRun.PipelineRunStatus.RUNNING,
            ).count(),
            1,
        )

    def test_schedule_all_blocks_completed_with_failures(self):
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline',
            pipeline_schedule_settings=dict(allow_blocks_to_fail=True),
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        ct = 0
        block_runs = pipeline_run.block_runs
        for b in block_runs:
            if ct == 0:
                b.update(status=BlockRun.BlockRunStatus.FAILED)
            else:
                b.update(status=BlockRun.BlockRunStatus.UPSTREAM_FAILED)
            ct += 1
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(
            scheduler.notification_sender, 'send_pipeline_run_failure_message'
        ) as mock_send_message:
            scheduler.schedule()
            self.assertEqual(pipeline_run.status, PipelineRun.PipelineRunStatus.FAILED)
            mock_send_message.assert_called_once_with(
                error=f'Failed blocks: {block_runs[0].block_uuid}.',
                pipeline=scheduler.pipeline,
                pipeline_run=pipeline_run,
            )

    def test_schedule_with_block_failures(self):
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline',
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        ct = 0
        block_runs = pipeline_run.block_runs
        for b in block_runs:
            if ct == 0:
                b.update(status=BlockRun.BlockRunStatus.FAILED)
            ct += 1
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(
            scheduler.notification_sender, 'send_pipeline_run_failure_message'
        ) as mock_send_message:
            scheduler.schedule()
            self.assertEqual(pipeline_run.status, PipelineRun.PipelineRunStatus.FAILED)
            mock_send_message.assert_called_once_with(
                error=f'Failed blocks: {block_runs[0].block_uuid}.',
                pipeline=scheduler.pipeline,
                pipeline_run=pipeline_run,
            )

    @patch('mage_ai.orchestration.pipeline_scheduler.run_pipeline')
    @patch('mage_ai.orchestration.pipeline_scheduler.job_manager')
    def test_schedule_streaming(self, mock_job_manager, mock_run_pipeline):
        pipeline = create_pipeline_with_blocks(
            'test pipeline 2',
            self.repo_path,
        )
        pipeline.type = PipelineType.STREAMING
        pipeline.save()
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline_2'
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        mock_has_pipeline_run_job = MagicMock()
        mock_job_manager.has_pipeline_run_job = mock_has_pipeline_run_job
        mock_has_pipeline_run_job.return_value = False
        mock_job_manager.add_job = MagicMock()
        scheduler.schedule()

        call_args = [
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
        ]

        self.assertTrue(len(mock_job_manager.add_job.mock_calls) == 1)

        mock_call = mock_job_manager.add_job.mock_calls[0]

        for i in range(5):
            self.assertEqual(call_args[i], mock_call[1][i])

        self.assertEqual(call_args[5], ignore_keys(mock_call[1][5], ['hostname']))

    def test_on_block_complete(self):
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline')
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(scheduler, 'schedule') as mock_schedule:
            scheduler.on_block_complete('block1')
            mock_schedule.assert_called_once()
            block_run = BlockRun.get(
                pipeline_run_id=pipeline_run.id, block_uuid='block1'
            )
            self.assertEqual(block_run.status, BlockRun.BlockRunStatus.COMPLETED)

    def test_on_block_complete_with_metrics(self):
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline')
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(scheduler, 'schedule') as mock_schedule:
            scheduler.on_block_complete('block1', metrics=dict(mage=1))
            mock_schedule.assert_called_once()
            block_run = BlockRun.get(
                pipeline_run_id=pipeline_run.id, block_uuid='block1'
            )
            self.assertEqual(block_run.status, BlockRun.BlockRunStatus.COMPLETED)
            self.assertEqual(block_run.metrics, dict(mage=1))

    def test_on_block_complete_without_schedule(self):
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline')
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(scheduler, 'schedule') as mock_schedule:
            scheduler.on_block_complete_without_schedule('block1')
            mock_schedule.assert_not_called()
            block_run = BlockRun.get(
                pipeline_run_id=pipeline_run.id, block_uuid='block1'
            )
            self.assertEqual(block_run.status, BlockRun.BlockRunStatus.COMPLETED)

    def test_on_block_complete_without_schedule_with_metrics(self):
        pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid='test_pipeline')
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
        with patch.object(scheduler, 'schedule') as mock_schedule:
            scheduler.on_block_complete_without_schedule('block1', metrics=dict(mage=1))
            mock_schedule.assert_not_called()
            block_run = BlockRun.get(
                pipeline_run_id=pipeline_run.id, block_uuid='block1'
            )
            self.assertEqual(block_run.status, BlockRun.BlockRunStatus.COMPLETED)
            self.assertEqual(block_run.metrics, dict(mage=1))

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
            schedule_type=ScheduleType.TIME,
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
            NotificationSender, 'send_pipeline_run_sla_passed_message'
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
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 1, 1, 20, 33),
            schedule_interval='@hourly',
        )
        PipelineSchedule.create(
            name='test_sla_pipeline_trigger_2',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 5, 1, 20, 33),
            schedule_interval='@hourly',
        )
        preferences = get_preferences(repo_path=self.repo_path)
        preferences.update_preferences(
            dict(
                sync_config=dict(
                    remote_repo_link='test_git_repo',
                    repo_path=self.repo_path,
                    branch='main',
                    sync_on_pipeline_run=True,
                )
            )
        )
        with patch.object(PipelineScheduler, 'schedule') as _:
            schedule_all()
            git_sync_instance.sync_data.assert_called_once()

    @freeze_time('2023-05-01 01:20:33')
    def test_schedule_all_pipeline_run_limit_all_triggers_set(self):
        pipeline = create_pipeline_with_blocks(
            'test pipeline_run_limit_all_triggers',
            self.repo_path,
        )
        ps1 = PipelineSchedule.create(
            name='test_limit_pipeline_trigger_1',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 5, 1, 20, 33),
            schedule_interval='@hourly',
        )
        ps2 = PipelineSchedule.create(
            name='test_limit_pipeline_trigger_2',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 5, 1, 20, 33),
            schedule_interval='@daily',
        )
        ps3 = PipelineSchedule.create(
            name='test_limit_pipeline_trigger_3',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 5, 1, 20, 33),
            schedule_interval='@weekly',
        )

        test_concurrency_config = dict(
            pipeline_run_limit_all_triggers=2,
        )
        with open(pipeline.config_path, 'w') as f:
            yaml.dump(
                merge_dict(
                    pipeline.to_dict(), dict(concurrency_config=test_concurrency_config)
                ),
                f,
            )

        with patch.object(PipelineScheduler, 'schedule') as _:
            schedule_all()
        self.assertEqual(1, len(ps1.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.INITIAL, ps1.pipeline_runs[0].status
        )
        self.assertEqual(1, len(ps2.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.RUNNING, ps2.pipeline_runs[0].status
        )
        self.assertEqual(1, len(ps3.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.RUNNING, ps3.pipeline_runs[0].status
        )

    @freeze_time('2023-05-03 01:20:33')
    def test_schedule_all_pipeline_run_limit_set(self):
        pipeline = create_pipeline_with_blocks(
            'test pipeline_run_limit',
            self.repo_path,
        )
        ps1 = PipelineSchedule.create(
            name='test_both_limit_pipeline_trigger_1',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 4, 1, 20, 33),
            schedule_interval='@daily',
        )
        PipelineRun.create(
            execution_date=datetime(2023, 3, 1, 0, 0, 0),
            pipeline_schedule_id=ps1.id,
            pipeline_uuid=pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.RUNNING,
        )
        ps2 = PipelineSchedule.create(
            name='test_both_limit_pipeline_trigger_2',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 5, 1, 20, 33),
            schedule_interval='@weekly',
        )
        ps3 = PipelineSchedule.create(
            name='test_both_limit_pipeline_trigger_3',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 6, 1, 20, 33),
            schedule_interval='@hourly',
        )

        test_concurrency_config = dict(
            pipeline_run_limit=1,
            pipeline_run_limit_all_triggers=2,
        )
        with open(pipeline.config_path, 'w') as f:
            yaml.dump(
                merge_dict(
                    pipeline.to_dict(), dict(concurrency_config=test_concurrency_config)
                ),
                f,
            )

        with patch.object(PipelineScheduler, 'schedule') as _:
            schedule_all()
        self.assertEqual(2, len(ps1.pipeline_runs))
        self.assertEqual(1, len(ps2.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.RUNNING, ps2.pipeline_runs[0].status
        )
        self.assertEqual(1, len(ps3.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.INITIAL, ps3.pipeline_runs[0].status
        )

    @freeze_time('2023-05-03 01:20:33')
    def test_schedule_all_pipeline_run_limit_skip_runs(self):
        pipeline = create_pipeline_with_blocks(
            'test pipeline_run_limit_skip',
            self.repo_path,
        )
        ps1 = PipelineSchedule.create(
            name='test_limit_skip_pipeline_trigger_1',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 4, 1, 20, 33),
            schedule_interval='@daily',
        )
        PipelineRun.create(
            execution_date=datetime(2023, 3, 1, 0, 0, 0),
            pipeline_schedule_id=ps1.id,
            pipeline_uuid=pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.RUNNING,
        )
        ps2 = PipelineSchedule.create(
            name='test_limit_skip_pipeline_trigger_2',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 5, 1, 20, 33),
            schedule_interval='@daily',
        )
        ps3 = PipelineSchedule.create(
            name='test_limit_skip_pipeline_trigger_3',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 6, 1, 20, 33),
            schedule_interval='@hourly',
        )

        test_concurrency_config = dict(
            pipeline_run_limit=1,
            pipeline_run_limit_all_triggers=2,
            on_pipeline_run_limit_reached='skip',
        )
        with open(pipeline.config_path, 'w') as f:
            yaml.dump(
                merge_dict(
                    pipeline.to_dict(), dict(concurrency_config=test_concurrency_config)
                ),
                f,
            )

        with patch.object(PipelineScheduler, 'schedule') as _:
            schedule_all()
        self.assertEqual(2, len(ps1.pipeline_runs))
        self.assertEqual(1, len(ps2.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.RUNNING, ps2.pipeline_runs[0].status
        )
        self.assertEqual(1, len(ps3.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.CANCELLED, ps3.pipeline_runs[0].status
        )

    @freeze_time('2023-05-03 01:20:33')
    def test_schedule_all_pipeline_run_limit_set_negative_quota(self):
        pipeline = create_pipeline_with_blocks(
            'test pipeline_run_limit_negative_quota',
            self.repo_path,
        )
        ps1 = PipelineSchedule.create(
            name='test_negative_quota_pipeline_trigger_1',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 2, 28, 1, 20, 33),
            schedule_interval='@daily',
        )
        PipelineRun.create(
            execution_date=datetime(2023, 3, 1, 0, 0, 0),
            pipeline_schedule_id=ps1.id,
            pipeline_uuid=pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.RUNNING,
        )
        PipelineRun.create(
            execution_date=datetime(2023, 3, 2, 0, 0, 0),
            pipeline_schedule_id=ps1.id,
            pipeline_uuid=pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.RUNNING,
        )
        ps2 = PipelineSchedule.create(
            name='test_negative_quota_pipeline_trigger_2',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 5, 1, 20, 33),
            schedule_interval='@weekly',
        )
        ps3 = PipelineSchedule.create(
            name='test_negative_quota_pipeline_trigger_3',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 6, 1, 20, 33),
            schedule_interval='@hourly',
        )

        test_concurrency_config = dict(
            pipeline_run_limit_all_triggers=1,
        )
        with open(pipeline.config_path, 'w') as f:
            yaml.dump(
                merge_dict(
                    pipeline.to_dict(), dict(concurrency_config=test_concurrency_config)
                ),
                f,
            )

        self.assertEqual(2, len(ps1.pipeline_runs))

        with patch.object(PipelineScheduler, 'schedule') as _:
            schedule_all()
        self.assertEqual(
            2,
            len(
                list(
                    filter(
                        lambda r: r.status == PipelineRun.PipelineRunStatus.RUNNING,
                        ps1.pipeline_runs,
                    )
                )
            ),
        )
        self.assertEqual(1, len(ps2.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.INITIAL, ps2.pipeline_runs[0].status
        )
        self.assertEqual(1, len(ps3.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.INITIAL, ps3.pipeline_runs[0].status
        )

    @freeze_time('2023-05-03 01:20:33')
    def test_schedule_all_pipeline_run_limit_include_all(self):
        pipeline = create_pipeline_with_blocks(
            'test pipeline_run_limit_include_all',
            self.repo_path,
        )
        ps1 = PipelineSchedule.create(
            name='test_limit_include_all_pipeline_trigger_1',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 4, 1, 20, 33),
            schedule_interval='@daily',
        )
        PipelineRun.create(
            execution_date=datetime(2023, 3, 1, 0, 0, 0),
            pipeline_schedule_id=ps1.id,
            pipeline_uuid=pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.RUNNING,
        )
        ps2 = PipelineSchedule.create(
            name='test_limit_include_all_pipeline_trigger_2',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 5, 1, 20, 33),
            schedule_interval='@weekly',
        )
        ps3 = PipelineSchedule.create(
            name='test_limit_include_all_pipeline_trigger_3',
            pipeline_uuid=pipeline.uuid,
            schedule_type=ScheduleType.TIME,
            status=ScheduleStatus.ACTIVE,
            start_time=datetime(2023, 4, 6, 1, 20, 33),
            schedule_interval='@hourly',
        )

        test_concurrency_config = dict(
            pipeline_run_limit=2,
            pipeline_run_limit_all_triggers=100,
            on_pipeline_run_limit_reached='skip',
        )
        with open(pipeline.config_path, 'w') as f:
            yaml.dump(
                merge_dict(
                    pipeline.to_dict(), dict(concurrency_config=test_concurrency_config)
                ),
                f,
            )

        with patch.object(PipelineScheduler, 'schedule') as _:
            schedule_all()
        self.assertEqual(2, len(ps1.pipeline_runs))
        self.assertEqual(1, len(ps2.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.RUNNING, ps2.pipeline_runs[0].status
        )
        self.assertEqual(1, len(ps3.pipeline_runs))
        self.assertEqual(
            PipelineRun.PipelineRunStatus.RUNNING, ps3.pipeline_runs[0].status
        )

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
            schedule_type=ScheduleType.TIME,
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
            schedule_type=ScheduleType.TIME,
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
        block_run2 = find(
            lambda br: br.block_uuid == 'block1', pipeline_run2.block_runs
        )
        block_run2.update(
            status=BlockRun.BlockRunStatus.RUNNING,
            started_at=now_time - timedelta(seconds=599),
        )
        pipeline_run2.update(status=PipelineRun.PipelineRunStatus.RUNNING)

        PipelineScheduler(pipeline_run=pipeline_run).schedule()
        PipelineScheduler(pipeline_run=pipeline_run2).schedule()
        self.assertEqual(block_run.status, BlockRun.BlockRunStatus.FAILED)
        self.assertEqual(block_run2.status, BlockRun.BlockRunStatus.RUNNING)
