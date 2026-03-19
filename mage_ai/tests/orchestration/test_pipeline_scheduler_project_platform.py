from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytz
from freezegun import freeze_time

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.triggers import ScheduleStatus, ScheduleType
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.orchestration.pipeline_scheduler import (
    PipelineScheduler,
    check_sla,
    run_block,
    schedule_all,
)
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks
from mage_ai.tests.shared.mixins import ProjectPlatformMixin


@patch(
    'mage_ai.orchestration.pipeline_scheduler_original.project_platform_activated',
    lambda: True,
)
@patch(
    'mage_ai.orchestration.db.models.schedules.project_platform_activated',
    lambda: True,
)
class PipelineSchedulerProjectPlatformTests(ProjectPlatformMixin, DBTestCase):
    def _create_pipeline_with_callbacks(self, full_path):
        pipeline = create_pipeline_with_blocks(
            self.faker.unique.slug().replace('-', '_'),
            repo_path=full_path,
        )
        suffix = self.faker.unique.pystr(min_chars=8, max_chars=8).lower()
        pipeline_callback = Block.create(
            f'pipeline_callback_{suffix}',
            'callback',
            full_path,
            language='python',
        )
        block_callback = Block.create(
            f'block_callback_{suffix}',
            'callback',
            full_path,
            language='python',
        )
        pipeline.add_block(pipeline_callback, pipeline_callback=True)
        pipeline.add_block(block_callback, upstream_block_uuids=['block1'])

        return pipeline, pipeline_callback.uuid, block_callback.uuid

    def test_init(self):
        with patch(
            'mage_ai.orchestration.pipeline_scheduler_original.project_platform_activated',
            lambda: True,
        ):
            with patch(
                'mage_ai.data_preparation.models.pipeline.project_platform_activated',
                lambda: True,
            ):
                with patch(
                    'mage_ai.orchestration.db.models.schedules.project_platform_activated',
                    lambda: True,
                ):
                    for settings in self.repo_paths.values():
                        pipeline = create_pipeline_with_blocks(
                            self.faker.unique.name(),
                            repo_path=settings['full_path'],
                        )
                        pipeline_schedule = PipelineSchedule.create(
                            name=self.faker.unique.name(),
                            pipeline_uuid=pipeline.uuid,
                            repo_path=settings['full_path'],
                            schedule_type=ScheduleType.TIME,
                        )
                        pipeline_run = PipelineRun.create(
                            pipeline_schedule_id=pipeline_schedule.id,
                            pipeline_uuid=pipeline.uuid,
                        )
                        scheduler = PipelineScheduler(pipeline_run=pipeline_run)
                        self.assertEqual(scheduler.pipeline.uuid, pipeline.uuid)

    def test_run_block(self):
        with patch(
            'mage_ai.orchestration.pipeline_scheduler_original.project_platform_activated',
            lambda: True,
        ):
            with patch(
                'mage_ai.orchestration.pipeline_scheduler_original.'
                'project_platform_activated',
                lambda: True,
            ):
                with patch(
                    'mage_ai.data_preparation.models.pipeline.project_platform_activated',
                    lambda: True,
                ):
                    with patch(
                        'mage_ai.orchestration.db.models.schedules.project_platform_activated',
                        lambda: True,
                    ):
                        for settings in self.repo_paths.values():
                            full_path = settings['full_path']
                            pipeline = create_pipeline_with_blocks(
                                self.faker.unique.name(),
                                repo_path=full_path,
                            )
                            pipeline_schedule = PipelineSchedule.create(
                                name=self.faker.unique.name(),
                                pipeline_uuid=pipeline.uuid,
                                repo_path=full_path,
                                schedule_type=ScheduleType.TIME,
                            )
                            pipeline_run = PipelineRun.create(
                                pipeline_schedule_id=pipeline_schedule.id,
                                pipeline_uuid=pipeline.uuid,
                                status=PipelineRun.PipelineRunStatus.RUNNING,
                            )

                            for block_run in pipeline_run.block_runs:
                                block_run.update(
                                    status=BlockRun.BlockRunStatus.RUNNING,
                                    started_at=datetime.utcnow() - timedelta(seconds=601),
                                )

                                class FakeExecutor:
                                    def execute(cls, **kwargs):
                                        pass

                                fake_executor = FakeExecutor()

                                class FakeExecutorFactory:
                                    @classmethod
                                    def get_block_executor(
                                        cls,
                                        pipeline,
                                        block_uuid,
                                        execution_partition,
                                        block_uuid_test=block_run.block_uuid,
                                        fake_executor=fake_executor,
                                        pipeline_run=pipeline_run,
                                        pipeline_test=pipeline,
                                        block_run_id=block_run.id
                                    ):
                                        self.assertEqual(block_uuid, block_uuid_test)
                                        self.assertEqual(
                                            execution_partition,
                                            pipeline_run.execution_partition,
                                        )
                                        self.assertEqual(pipeline.uuid, pipeline_test.uuid)

                                        return fake_executor

                                class FakeRepoConfig:
                                    def __init__(self):
                                        self.retry_config = {}

                                fake_repo_config = FakeRepoConfig()

                                def __get_repo_config(
                                    repo_path,
                                    fake_repo_config=fake_repo_config,
                                    full_path=full_path,
                                ):
                                    self.assertEqual(repo_path, full_path)
                                    return fake_repo_config

                                with patch(
                                    'mage_ai.orchestration.pipeline_scheduler_original.'
                                    'ExecutorFactory',
                                    FakeExecutorFactory,
                                ):
                                    with patch(
                                        'mage_ai.orchestration.pipeline_scheduler_original.'
                                        'get_repo_config',
                                        __get_repo_config,
                                    ):
                                        run_block(
                                            pipeline_run_id=pipeline_run.id,
                                            block_run_id=block_run.id,
                                            variables={},
                                            tags={},
                                        )

    def test_check_sla(self):
        with patch(
            'mage_ai.orchestration.pipeline_scheduler_original.project_platform_activated',
            lambda: True,
        ):
            with patch(
                'mage_ai.data_preparation.models.pipeline.project_platform_activated',
                lambda: True,
            ):
                pipeline_schedules = []
                pipeline_runs = []
                for settings in self.repo_paths.values():
                    full_path = settings['full_path']
                    pipeline = create_pipeline_with_blocks(
                        self.faker.unique.name(),
                        repo_path=full_path,
                    )
                    pipeline_schedule = PipelineSchedule.create(
                        name=self.faker.unique.name(),
                        pipeline_uuid=pipeline.uuid,
                        repo_path=full_path,
                        schedule_type=ScheduleType.TIME,
                        status=ScheduleStatus.ACTIVE,
                    )
                    pipeline_run = PipelineRun.create(
                        pipeline_schedule_id=pipeline_schedule.id,
                        pipeline_uuid=pipeline.uuid,
                        status=PipelineRun.PipelineRunStatus.RUNNING,
                    )

                    pipeline_schedules.append(pipeline_schedule)
                    pipeline_runs.append(pipeline_run)

        PipelineRunMock = MagicMock()

        with patch(
            'mage_ai.orchestration.pipeline_scheduler_original.PipelineRun',
            PipelineRunMock,
        ):
            with patch(
                'mage_ai.data_preparation.models.pipeline.project_platform_activated',
                lambda: True,
            ):
                with patch(
                    'mage_ai.orchestration.db.models.schedules.project_platform_activated',
                    lambda: True,
                ):
                    with patch.object(PipelineRunMock, 'in_progress_runs') as mock:
                        check_sla()
                        mock.assert_called_once_with(set([s.id for s in pipeline_schedules]))

    def test_schedule_all_blocks_completed_executes_pipeline_callbacks_only(self):
        with patch(
            'mage_ai.orchestration.pipeline_scheduler_original.project_platform_activated',
            lambda: True,
        ):
            with patch(
                'mage_ai.data_preparation.models.pipeline.project_platform_activated',
                lambda: True,
            ):
                with patch(
                    'mage_ai.orchestration.db.models.schedules.project_platform_activated',
                    lambda: True,
                ):
                    settings = next(iter(self.repo_paths.values()))
                    full_path = settings['full_path']
                    pipeline, pipeline_callback_uuid, block_callback_uuid = (
                        self._create_pipeline_with_callbacks(full_path)
                    )

                    pipeline_schedule = PipelineSchedule.create(
                        name=self.faker.unique.name(),
                        pipeline_uuid=pipeline.uuid,
                        repo_path=full_path,
                        schedule_type=ScheduleType.TIME,
                    )
                    pipeline_run = PipelineRun.create(
                        pipeline_schedule_id=pipeline_schedule.id,
                        pipeline_uuid=pipeline.uuid,
                        status=PipelineRun.PipelineRunStatus.RUNNING,
                    )
                    for block_run in pipeline_run.block_runs:
                        block_run.update(status=BlockRun.BlockRunStatus.COMPLETED)

                    scheduler = PipelineScheduler(pipeline_run=pipeline_run)
                    pipeline_callback = scheduler.pipeline.pipeline_callbacks_by_uuid[
                        pipeline_callback_uuid
                    ]
                    block_callback = scheduler.pipeline.callbacks_by_uuid[block_callback_uuid]

                    with patch.object(
                        scheduler.notification_sender, 'send_pipeline_run_success_message',
                    ):
                        with patch.object(
                            pipeline_callback, 'execute_callback',
                        ) as mock_pipeline_callback:
                            with patch.object(
                                block_callback, 'execute_callback',
                            ) as mock_block_callback:
                                scheduler.schedule()

                    self.assertEqual(
                        PipelineRun.PipelineRunStatus.COMPLETED,
                        pipeline_run.status,
                    )
                    mock_pipeline_callback.assert_called_once()
                    self.assertEqual('on_success', mock_pipeline_callback.call_args[0][0])
                    mock_block_callback.assert_not_called()

    def test_schedule_failed_pipeline_executes_pipeline_failure_callbacks_only(self):
        with patch(
            'mage_ai.orchestration.pipeline_scheduler_original.project_platform_activated',
            lambda: True,
        ):
            with patch(
                'mage_ai.data_preparation.models.pipeline.project_platform_activated',
                lambda: True,
            ):
                with patch(
                    'mage_ai.orchestration.db.models.schedules.project_platform_activated',
                    lambda: True,
                ):
                    settings = next(iter(self.repo_paths.values()))
                    full_path = settings['full_path']
                    pipeline, pipeline_callback_uuid, block_callback_uuid = (
                        self._create_pipeline_with_callbacks(full_path)
                    )

                    pipeline_schedule = PipelineSchedule.create(
                        name=self.faker.unique.name(),
                        pipeline_uuid=pipeline.uuid,
                        repo_path=full_path,
                        schedule_type=ScheduleType.TIME,
                    )
                    pipeline_run = PipelineRun.create(
                        pipeline_schedule_id=pipeline_schedule.id,
                        pipeline_uuid=pipeline.uuid,
                        status=PipelineRun.PipelineRunStatus.RUNNING,
                    )
                    failed_block_run = next(
                        br for br in pipeline_run.block_runs if br.block_uuid == 'block1'
                    )
                    failed_block_run.update(status=BlockRun.BlockRunStatus.FAILED)

                    scheduler = PipelineScheduler(pipeline_run=pipeline_run)
                    pipeline_callback = scheduler.pipeline.pipeline_callbacks_by_uuid[
                        pipeline_callback_uuid
                    ]
                    block_callback = scheduler.pipeline.callbacks_by_uuid[block_callback_uuid]

                    with patch.object(
                        scheduler.notification_sender, 'send_pipeline_run_failure_message',
                    ) as mock_send_message:
                        with patch.object(
                            pipeline_callback, 'execute_callback',
                        ) as mock_pipeline_callback:
                            with patch.object(
                                block_callback, 'execute_callback',
                            ) as mock_block_callback:
                                scheduler.schedule()

                    self.assertEqual(
                        PipelineRun.PipelineRunStatus.FAILED,
                        pipeline_run.status,
                    )
                    mock_send_message.assert_called_once()
                    mock_pipeline_callback.assert_called_once()
                    self.assertEqual('on_failure', mock_pipeline_callback.call_args[0][0])
                    self.assertIsInstance(
                        mock_pipeline_callback.call_args[1]['callback_kwargs']['__error'],
                        Exception,
                    )
                    mock_block_callback.assert_not_called()

    @freeze_time('2023-05-01 01:20:33')
    def test_pipeline_run_timeout_cancel_does_not_execute_failure_callbacks(self):
        with patch(
            'mage_ai.orchestration.pipeline_scheduler_original.project_platform_activated',
            lambda: True,
        ):
            with patch(
                'mage_ai.data_preparation.models.pipeline.project_platform_activated',
                lambda: True,
            ):
                with patch(
                    'mage_ai.orchestration.db.models.schedules.project_platform_activated',
                    lambda: True,
                ):
                    settings = next(iter(self.repo_paths.values()))
                    full_path = settings['full_path']
                    pipeline, pipeline_callback_uuid, _ = (
                        self._create_pipeline_with_callbacks(full_path)
                    )

                    pipeline_schedule = PipelineSchedule.create(
                        name=self.faker.unique.name(),
                        pipeline_uuid=pipeline.uuid,
                        repo_path=full_path,
                        schedule_type=ScheduleType.TIME,
                        settings=dict(
                            timeout=600,
                            timeout_status=PipelineRun.PipelineRunStatus.CANCELLED,
                        ),
                    )
                    pipeline_run = PipelineRun.create(
                        execution_date=datetime(
                            2023,
                            5,
                            1,
                            1,
                            10,
                            32,
                            tzinfo=pytz.utc,
                        ).astimezone(),
                        pipeline_schedule_id=pipeline_schedule.id,
                        pipeline_uuid=pipeline.uuid,
                        started_at=datetime(
                            2023,
                            5,
                            1,
                            1,
                            10,
                            32,
                            tzinfo=pytz.utc,
                        ).astimezone(),
                        status=PipelineRun.PipelineRunStatus.RUNNING,
                    )

                    scheduler = PipelineScheduler(pipeline_run=pipeline_run)
                    pipeline_callback = scheduler.pipeline.pipeline_callbacks_by_uuid[
                        pipeline_callback_uuid
                    ]

                    with patch.object(
                        scheduler.notification_sender, 'send_pipeline_run_failure_message',
                    ) as mock_send_message:
                        with patch.object(
                            pipeline_callback, 'execute_callback',
                        ) as mock_pipeline_callback:
                            scheduler.schedule()

                    self.assertEqual(
                        PipelineRun.PipelineRunStatus.CANCELLED,
                        pipeline_run.status,
                    )
                    mock_send_message.assert_not_called()
                    mock_pipeline_callback.assert_not_called()

    @freeze_time('2023-11-11 12:30:00')
    def test_schedule_all(self):
        with patch(
            'mage_ai.orchestration.pipeline_scheduler_original.project_platform_activated',
            lambda: True,
        ):
            with patch(
                'mage_ai.orchestration.pipeline_scheduler_original.'
                'project_platform_activated',
                lambda: True,
            ):
                with patch(
                    'mage_ai.data_preparation.models.pipeline.project_platform_activated',
                    lambda: True,
                ):
                    with patch(
                        'mage_ai.orchestration.db.models.schedules.project_platform_activated',
                        lambda: True,
                    ):
                        PipelineRun.query.delete()

                        pipeline_schedules = []
                        for settings in self.repo_paths.values():
                            full_path = settings['full_path']
                            pipeline = create_pipeline_with_blocks(
                                self.faker.unique.name(),
                                repo_path=full_path,
                            )
                            pipeline_schedule = PipelineSchedule.create(
                                name=self.faker.unique.name(),
                                pipeline_uuid=pipeline.uuid,
                                repo_path=full_path,
                                schedule_interval='@hourly',
                                schedule_type=ScheduleType.TIME,
                                start_time=datetime(2023, 10, 10, 13, 13, 20),
                                status=ScheduleStatus.ACTIVE,
                            )
                            pipeline_schedules.append(pipeline_schedule)

                        count = PipelineRun.query.count()

                        class PipelineSchedulerMock:
                            def __init__(self, pipeline_run):
                                self.pipeline_run = pipeline_run

                            def schedule(self):
                                pass

                            def start(self):
                                pass

                        with patch(
                            'mage_ai.orchestration.pipeline_scheduler_original.'
                            'PipelineScheduler',
                            PipelineSchedulerMock,
                        ):
                            with patch.object(PipelineSchedulerMock, 'schedule') as mock:
                                with patch.object(PipelineSchedulerMock, 'start') as mock_start:
                                    schedule_all()
                                    count += 2
                                    self.assertEqual(PipelineRun.query.count(), count)
                                    self.assertEqual(mock.call_count, 0)
                                    self.assertEqual(mock_start.call_count, 2)

                            with patch.object(PipelineSchedulerMock, 'schedule') as mock:
                                with patch.object(PipelineSchedulerMock, 'start') as mock_start:
                                    for pr in PipelineRun.query.all():
                                        pr.update(status=PipelineRun.PipelineRunStatus.RUNNING)

                                    schedule_all()
                                    self.assertEqual(PipelineRun.query.count(), count)
                                    self.assertEqual(mock.call_count, 2)
                                    self.assertEqual(mock_start.call_count, 0)
