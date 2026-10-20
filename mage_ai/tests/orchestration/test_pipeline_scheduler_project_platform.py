from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from freezegun import freeze_time

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
