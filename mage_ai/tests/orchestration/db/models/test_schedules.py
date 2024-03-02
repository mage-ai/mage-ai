import os
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch
from uuid import uuid4

from croniter import croniter
from freezegun import freeze_time

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
    Trigger,
)
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.orchestration.pipeline_scheduler import configure_pipeline_run_payload

# from mage_ai.settings.utils import base_repo_path
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.base_test import AsyncDBTestCase, DBTestCase
from mage_ai.tests.factory import (
    create_pipeline_run,
    create_pipeline_run_with_schedule,
    create_pipeline_with_blocks,
)
from mage_ai.tests.shared.mixins import ProjectPlatformMixin, build_hooks


class PipelineScheduleTests(DBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        pipeline, blocks = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
            return_blocks=True,
        )
        self.pipeline = pipeline
        self.blocks = blocks

    def test_fetch_latest_pipeline_runs_without_retries(self):
        pipeline_schedule = PipelineSchedule.create(
            name='test pipeline',
            pipeline_uuid='test_pipeline',
        )
        for i in range(1, 5):
            create_pipeline_run_with_schedule(
                'test_pipeline',
                execution_date=datetime(2023, 10, 1),
                pipeline_schedule_id=pipeline_schedule.id,
                started_at=datetime(2023, 10, 1, i, 0, 0),
            )
            create_pipeline_run_with_schedule(
                'test_pipeline',
                execution_date=datetime(2023, 10, 15),
                pipeline_schedule_id=pipeline_schedule.id,
                started_at=datetime(2023, 10, 15, 0, i * 10, 0),
            )
            create_pipeline_run_with_schedule(
                'test_pipeline',
                execution_date=datetime(2023, 11, 1),
                pipeline_schedule_id=pipeline_schedule.id,
                started_at=datetime(2023, 11, 1, 12, 30, i),
            )
        latest_pipeline_runs = (
            pipeline_schedule.fetch_latest_pipeline_runs_without_retries(
                [pipeline_schedule.id],
            )
        )
        self.assertEqual(len(latest_pipeline_runs), 3)
        latest_pipeline_runs.sort(
            key=lambda r: r.execution_date,
        )
        self.assertEqual(
            latest_pipeline_runs[0].execution_date,
            datetime(2023, 10, 1),
        )
        self.assertEqual(
            latest_pipeline_runs[0].started_at, datetime(2023, 10, 1, 4, 0, 0)
        )
        self.assertEqual(
            latest_pipeline_runs[1].execution_date,
            datetime(2023, 10, 15),
        )
        self.assertEqual(
            latest_pipeline_runs[1].started_at, datetime(2023, 10, 15, 0, 40, 0)
        )
        self.assertEqual(
            latest_pipeline_runs[2].execution_date,
            datetime(2023, 11, 1),
        )
        self.assertEqual(
            latest_pipeline_runs[2].started_at, datetime(2023, 11, 1, 12, 30, 4)
        )

    def test_pipeline_runs_count(self):
        pipeline_schedule = PipelineSchedule.create(
            name='test schedule', pipeline_uuid='test_pipeline'
        )
        for _ in range(5):
            create_pipeline_run_with_schedule(
                'test_pipeline',
                pipeline_schedule_id=pipeline_schedule.id,
            )
        self.assertEqual(pipeline_schedule.pipeline_runs_count, 5)

    def test_in_progress_runs_count(self):
        pipeline_schedule = PipelineSchedule.create(
            name='test in progress runs schedule', pipeline_uuid='test_pipeline'
        )
        for _ in range(5):
            create_pipeline_run_with_schedule(
                'test_pipeline',
                pipeline_schedule_id=pipeline_schedule.id,
                status=PipelineRun.PipelineRunStatus.RUNNING,
            )
        for _ in range(3):
            create_pipeline_run_with_schedule(
                'test_pipeline',
                pipeline_schedule_id=pipeline_schedule.id,
                status=PipelineRun.PipelineRunStatus.INITIAL,
            )
        for _ in range(6):
            create_pipeline_run_with_schedule(
                'test_pipeline',
                pipeline_schedule_id=pipeline_schedule.id,
                status=PipelineRun.PipelineRunStatus.COMPLETED,
            )
        create_pipeline_run_with_schedule(
            'test_pipeline',
            pipeline_schedule_id=pipeline_schedule.id,
            status=PipelineRun.PipelineRunStatus.RUNNING,
            passed_sla=True,
        )
        self.assertEqual(pipeline_schedule.pipeline_in_progress_runs_count, 8)
        self.assertEqual(pipeline_schedule.pipeline_runs_count, 15)

    def test_last_pipeline_run_status(self):
        import time

        pipeline_schedule = PipelineSchedule.create(
            name='test last pipeline run status schedule', pipeline_uuid='test_pipeline'
        )
        pipeline_schedule2 = PipelineSchedule.create(
            name='test last pipeline run status no runs schedule',
            pipeline_uuid='test_pipeline',
        )
        for _ in range(5):
            create_pipeline_run_with_schedule(
                'test_pipeline',
                pipeline_schedule_id=pipeline_schedule.id,
                status=PipelineRun.PipelineRunStatus.RUNNING,
            )
        time.sleep(2)
        create_pipeline_run_with_schedule(
            'test_pipeline',
            pipeline_schedule_id=pipeline_schedule.id,
            status=PipelineRun.PipelineRunStatus.FAILED,
        )
        self.assertEqual(
            pipeline_schedule.last_pipeline_run_status,
            PipelineRun.PipelineRunStatus.FAILED,
        )
        self.assertIsNone(pipeline_schedule2.last_pipeline_run_status)

    def test_validate_schedule_interval(self):
        PipelineSchedule.create(
            name=self.faker.name(),
            pipeline_uuid='test_pipeline',
            schedule_interval='@daily',
        )
        PipelineSchedule.create(
            name=self.faker.name(),
            pipeline_uuid='test_pipeline',
            schedule_interval='* * * * *',
        )
        with self.assertRaises(ValueError) as context:
            PipelineSchedule.create(
                name=self.faker.name(),
                pipeline_uuid='test_pipeline',
                schedule_interval='random_str',
            )
        self.assertTrue('Cron expression is invalid.' in str(context.exception))

    def test_active_schedules(self):
        create_pipeline_with_blocks(
            'test active schedule 1',
            self.repo_path,
        )
        create_pipeline_with_blocks(
            'test active schedule 2',
            self.repo_path,
        )
        PipelineSchedule.create(
            name='test active schedule 1',
            pipeline_uuid='test_active_schedule_1',
            schedule_interval='@daily',
        )
        pipeline_schedule2 = PipelineSchedule.create(
            name='test active schedule 2',
            pipeline_uuid='test_active_schedule_1',
            schedule_interval='@daily',
        )
        pipeline_schedule3 = PipelineSchedule.create(
            name='test active schedule 3',
            pipeline_uuid='test_active_schedule_2',
            schedule_interval='@daily',
        )
        PipelineSchedule.create(
            name='test active schedule 4',
            pipeline_uuid='test_active_schedule_2',
            schedule_interval='@daily',
        )
        pipeline_schedule2.update(status=ScheduleStatus.ACTIVE)
        pipeline_schedule3.update(status=ScheduleStatus.ACTIVE)
        results1 = PipelineSchedule.active_schedules(
            pipeline_uuids=['test_active_schedule_1']
        )
        results2 = PipelineSchedule.active_schedules(
            pipeline_uuids=['test_active_schedule_2']
        )
        results3 = PipelineSchedule.active_schedules()
        self.assertEqual(set([r.id for r in results1]), set([pipeline_schedule2.id]))
        self.assertEqual(set([r.id for r in results2]), set([pipeline_schedule3.id]))
        self.assertEqual(
            set([r.id for r in results3]),
            set([pipeline_schedule2.id, pipeline_schedule3.id]),
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_should_schedule_with_initial_run(self):
        shared_attrs = dict(
            last_enabled_at=datetime(2023, 10, 13, 1, 0, 0),
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.DAILY,
            schedule_type=ScheduleType.TIME,
            settings=dict(create_initial_pipeline_run=True)
        )

        self.assertFalse(
            PipelineSchedule.create(
                name=self.faker.name(), **shared_attrs
            ).should_schedule()
        )

        self.assertFalse(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        start_time=datetime(2023, 10, 11, 12, 13, 15),
                        status=ScheduleStatus.ACTIVE,
                    ),
                )
            ).should_schedule()
        )

        self.assertFalse(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        pipeline_uuid='does_not_exist',
                        start_time=datetime(2023, 10, 11, 12, 13, 13),
                        status=ScheduleStatus.ACTIVE,
                    ),
                )
            ).should_schedule()
        )

        pipeline_schedule1 = PipelineSchedule.create(
            **merge_dict(
                shared_attrs,
                dict(
                    name=self.faker.name(),
                    schedule_interval=ScheduleInterval.ONCE,
                    start_time=datetime(2023, 10, 11, 12, 13, 13),
                    status=ScheduleStatus.ACTIVE,
                ),
            )
        )
        self.assertTrue(pipeline_schedule1.should_schedule(pipeline=self.pipeline))
        PipelineRun.create(
            pipeline_schedule_id=pipeline_schedule1.id,
            pipeline_uuid=pipeline_schedule1.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )
        self.assertFalse(pipeline_schedule1.should_schedule())

        self.assertFalse(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=None,
                        status=ScheduleStatus.ACTIVE,
                    ),
                )
            ).should_schedule()
        )

        self.assertTrue(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(name=self.faker.name(), status=ScheduleStatus.ACTIVE),
                )
            ).should_schedule()
        )
        self.assertTrue(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.HOURLY,
                        status=ScheduleStatus.ACTIVE
                    ),
                )
            ).should_schedule()
        )
        self.assertTrue(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.WEEKLY,
                        status=ScheduleStatus.ACTIVE
                    ),
                )
            ).should_schedule()
        )
        self.assertTrue(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.MONTHLY,
                        status=ScheduleStatus.ACTIVE
                    ),
                )
            ).should_schedule()
        )

    @freeze_time('2024-01-01 00:03:14')
    def test_should_schedule_execution_dates(self):
        shared_attrs = dict(
            last_enabled_at=datetime(2023, 12, 31, 12, 32, 0),
            created_at=datetime(2023, 12, 31, 12, 31, 0),
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.DAILY,
            schedule_type=ScheduleType.TIME,
        )

        for schedule_interval, execution_date_true, execution_date_false in [
            (
                ScheduleInterval.HOURLY,
                datetime(2024, 1, 1, 1, 0, 0),
                datetime(2024, 1, 1, 0, 0, 0),
            ),
            (
                ScheduleInterval.DAILY,
                datetime(2024, 1, 2, 0, 0, 0),
                datetime(2024, 1, 1, 0, 0, 0),
            ),
            (
                ScheduleInterval.WEEKLY,
                datetime(2024, 1, 8, 0, 0, 0),
                datetime(2024, 1, 1, 0, 0, 0),
            ),
            (
                ScheduleInterval.MONTHLY,
                datetime(2024, 2, 1, 0, 0, 0),
                datetime(2024, 1, 1, 0, 0, 0),
            ),
        ]:
            pipeline_schedule_false = PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=schedule_interval,
                        # Set the start time to one second ago
                        start_time=datetime(2024, 1, 1, 0, 3, 13),
                        status=ScheduleStatus.ACTIVE,
                    ),
                )
            )
            self.assertFalse(pipeline_schedule_false.should_schedule())

            pipeline_schedule = PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=schedule_interval,
                        # Set the start time to one month ago
                        start_time=datetime(2023, 12, 1, 0, 3, 14),
                        status=ScheduleStatus.ACTIVE,
                    ),
                )
            )
            self.assertTrue(pipeline_schedule.should_schedule())
            PipelineRun.create(
                execution_date=execution_date_true,
                pipeline_schedule_id=pipeline_schedule.id,
                pipeline_uuid=pipeline_schedule.pipeline_uuid,
                status=PipelineRun.PipelineRunStatus.COMPLETED,
            )
            self.assertTrue(pipeline_schedule.should_schedule())
            PipelineRun.create(
                execution_date=execution_date_false,
                pipeline_schedule_id=pipeline_schedule.id,
                pipeline_uuid=pipeline_schedule.pipeline_uuid,
                status=PipelineRun.PipelineRunStatus.COMPLETED,
            )
            self.assertFalse(pipeline_schedule.should_schedule())

    @freeze_time('2024-01-01 00:59:14')
    def test_should_schedule_before_last_enabled_at(self):
        shared_attrs = dict(
            last_enabled_at=datetime(2024, 2, 1, 1, 30, 0),
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.DAILY,
            schedule_type=ScheduleType.TIME,
        )

        for schedule_interval, execution_date in [
            (
                ScheduleInterval.HOURLY,
                datetime(2024, 1, 1, 1, 0, 0),
            ),
            (
                ScheduleInterval.DAILY,
                datetime(2024, 1, 2, 0, 0, 0),
            ),
            (
                ScheduleInterval.WEEKLY,
                datetime(2024, 1, 8, 0, 0, 0),
            ),
            (
                ScheduleInterval.MONTHLY,
                datetime(2024, 2, 1, 0, 0, 0),
            ),
        ]:
            pipeline_schedule_true = PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        last_enabled_at=datetime(2023, 12, 31, 15, 59, 59),
                        name=self.faker.name(),
                        schedule_interval=schedule_interval,
                        # Set the start time to one month ago
                        start_time=datetime(2023, 12, 1, 0, 3, 14),
                        status=ScheduleStatus.ACTIVE,
                    ),
                )
            )
            self.assertTrue(pipeline_schedule_true.should_schedule())

            pipeline_schedule_false = PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=schedule_interval,
                        # Set the start time to one month ago
                        start_time=datetime(2023, 12, 1, 0, 3, 14),
                        status=ScheduleStatus.ACTIVE,
                    ),
                )
            )
            self.assertFalse(pipeline_schedule_false.should_schedule())

            PipelineRun.create(
                execution_date=execution_date,
                pipeline_schedule_id=pipeline_schedule_false.id,
                pipeline_uuid=pipeline_schedule_false.pipeline_uuid,
                status=PipelineRun.PipelineRunStatus.COMPLETED,
            )
            self.assertFalse(pipeline_schedule_false.should_schedule())

    @freeze_time('2023-10-11 12:13:14')
    def test_should_schedule_when_landing_time_enabled(self):
        shared_attrs = dict(
            last_enabled_at=datetime(2023, 10, 11, 1, 0, 0),
            created_at=datetime(2023, 10, 11, 0, 0, 0),
            pipeline_uuid='test_pipeline',
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
            status=ScheduleStatus.ACTIVE,
        )

        # No previous runtimes
        self.assertTrue(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.HOURLY,
                    ),
                )
            ).should_schedule()
        )

        for (
            schedule_interval,
            previous_runtimes,
            landing_time_true,
            landing_time_false,
        ) in [
            (
                ScheduleInterval.HOURLY,
                # AVG: 4
                # STD: 2
                [1, 2, 3, 4, 5, 6, 7],
                datetime(2023, 10, 5, 13, 13, 20),
                datetime(2023, 10, 6, 14, 13, 21),
            ),
            (
                ScheduleInterval.DAILY,
                # AVG: 4000
                # STD: 1081
                [1000, 2000, 3000, 4000, 5000, 6000, 7000],
                datetime(2023, 10, 5, 13, 37, 55),
                datetime(2023, 10, 6, 13, 37, 56),
            ),
            (
                # 2023-10-11 is a Wednesday
                ScheduleInterval.WEEKLY,
                # AVG: 216000
                # STD: 46662
                [
                    1 * 86400,
                    1.5 * 86400,
                    2 * 86400,
                    2.5 * 86400,
                    3 * 86400,
                    3.5 * 86400,
                    4 * 86400,
                ],
                # 2023-10-21 is a Saturday
                datetime(2023, 10, 7, 13, 10, 56),
                datetime(2023, 10, 7, 13, 10, 57),
            ),
            (
                ScheduleInterval.MONTHLY,
                # AVG: 537,536
                # STD: 131,304
                # 7 days
                # 17 hours
                # 47 minutes
                # 20 seconds
                [
                    3 * 86400,
                    3.5 * 86400,
                    5 * 86400,
                    5.5 * 86400,
                    7 * 86400,
                    7.5 * 86400,
                    12 * 86400,
                ],
                datetime(2023, 9, 19, 5, 50, 13),
                datetime(2023, 9, 19, 5, 50, 14),
            ),
        ]:
            self.assertTrue(
                PipelineSchedule.create(
                    **merge_dict(
                        shared_attrs,
                        dict(
                            name=self.faker.name(),
                            schedule_interval=schedule_interval,
                            start_time=landing_time_true,
                        ),
                    )
                ).should_schedule(previous_runtimes=previous_runtimes)
            )
            self.assertFalse(
                PipelineSchedule.create(
                    **merge_dict(
                        shared_attrs,
                        dict(
                            name=self.faker.name(),
                            schedule_interval=schedule_interval,
                            start_time=landing_time_false,
                        ),
                    )
                ).should_schedule(previous_runtimes=previous_runtimes)
            )

    def test_landing_time_enabled(self):
        for schedule_type in [
            ScheduleType.API,
            ScheduleType.EVENT,
        ]:
            self.assertFalse(
                PipelineSchedule.create(
                    name=self.faker.name(),
                    pipeline_uuid='test_pipeline',
                    schedule_interval=ScheduleInterval.HOURLY,
                    schedule_type=schedule_type,
                    settings=dict(landing_time_enabled=True),
                ).landing_time_enabled()
            )

        for schedule_interval in [
            '* * * * *',
            ScheduleInterval.ONCE,
        ]:
            self.assertFalse(
                PipelineSchedule.create(
                    name=self.faker.name(),
                    pipeline_uuid='test_pipeline',
                    schedule_interval=schedule_interval,
                    schedule_type=ScheduleType.TIME,
                    settings=dict(landing_time_enabled=True),
                ).landing_time_enabled()
            )

        self.assertFalse(
            PipelineSchedule.create(
                name=self.faker.name(),
                pipeline_uuid='test_pipeline',
                schedule_interval=ScheduleInterval.HOURLY,
                schedule_type=ScheduleType.TIME,
                settings=dict(landing_time_enabled=False),
            ).landing_time_enabled()
        )

        self.assertFalse(
            PipelineSchedule.create(
                name=self.faker.name(),
                pipeline_uuid='test_pipeline',
                schedule_interval=ScheduleInterval.HOURLY,
                schedule_type=ScheduleType.TIME,
                settings={},
            ).landing_time_enabled()
        )

        self.assertTrue(
            PipelineSchedule.create(
                name=self.faker.name(),
                pipeline_uuid='test_pipeline',
                schedule_interval=ScheduleInterval.HOURLY,
                schedule_type=ScheduleType.TIME,
                settings=dict(landing_time_enabled=True),
            ).landing_time_enabled()
        )

    @freeze_time('2023-12-10 12:00:00')
    def test_runtime_history(self):
        pipeline_schedule = PipelineSchedule.create(
            name=self.faker.name(),
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.DAILY,
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
        )
        self.assertEqual(pipeline_schedule.runtime_history(), [])

        pipeline_schedule2 = PipelineSchedule.create(
            name=self.faker.name(),
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.DAILY,
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
        )

        for created_at_hour, completed_at_hour, execution_date_hour in [
            (1, 2, 4),
            (2, 4, 3),
            (1, 7, 2),
            (2, 9, 1),
            (9, 11, 0),
            (11, 14, 5),
            (14, 18, 6),
            (18, 23, 7),
        ]:
            created_at = datetime(2023, 12, 10, created_at_hour, 0, 0)
            completed_at = datetime(2023, 12, 10, completed_at_hour, 0, 0)
            execution_date = datetime(2023, 12, 10, execution_date_hour, 0, 0)

            for ps in [pipeline_schedule, pipeline_schedule2]:
                PipelineRun.create(
                    completed_at=completed_at,
                    created_at=created_at,
                    execution_date=execution_date,
                    pipeline_schedule_id=ps.id,
                    pipeline_uuid=ps.pipeline_uuid,
                    status=PipelineRun.PipelineRunStatus.COMPLETED,
                    variables=ps.variables,
                )

        created_at = datetime(2023, 12, 10, 0, 0, 0)
        completed_at = datetime(2023, 12, 10, 23, 0, 0)
        execution_date = datetime(2023, 12, 10, 23, 59, 59)
        PipelineRun.create(
            completed_at=completed_at,
            created_at=created_at,
            execution_date=execution_date,
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.FAILED,
            variables=pipeline_schedule.variables,
        )

        self.assertEqual(
            pipeline_schedule.runtime_history(),
            [
                (5 * 3600.0),
                (4 * 3600.0),
                (3 * 3600.0),
                (1 * 3600.0),
                (2 * 3600.0),
                (6 * 3600.0),
                (7 * 3600.0),
            ],
        )

        created_at = datetime(2023, 12, 10, 0, 0, 0)
        completed_at = datetime(2023, 12, 10, 23, 0, 0)
        execution_date = datetime(2023, 12, 10, 23, 59, 59)
        pipeline_run = PipelineRun.create(
            completed_at=completed_at,
            created_at=created_at,
            execution_date=execution_date,
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
            variables=pipeline_schedule.variables,
        )

        self.assertEqual(
            pipeline_schedule.runtime_history(pipeline_run=pipeline_run),
            [
                (23 * 3600.0),
                (5 * 3600.0),
                (4 * 3600.0),
                (3 * 3600.0),
                (1 * 3600.0),
                (2 * 3600.0),
                (6 * 3600.0),
            ],
        )
        self.assertEqual(
            pipeline_schedule.runtime_history(
                pipeline_run=pipeline_run,
                sample_size=5,
            ),
            [
                (23 * 3600.0),
                (5 * 3600.0),
                (4 * 3600.0),
                (3 * 3600.0),
                (1 * 3600.0),
            ],
        )

        created_at = datetime(2023, 12, 10, 0, 0, 0)
        completed_at = datetime(2023, 12, 10, 22, 0, 0)
        execution_date = datetime(2023, 12, 11, 23, 59, 59)
        pipeline_run = PipelineRun.create(
            completed_at=completed_at,
            created_at=created_at,
            execution_date=execution_date,
            metrics=dict(
                previous_runtimes=[
                    1.0,
                    2.0,
                    3.0,
                    4.0,
                    5.0,
                    6.0,
                    7.0,
                    8.0,
                ]
            ),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
            variables=pipeline_schedule.variables,
        )

        self.assertEqual(
            pipeline_schedule.runtime_history(pipeline_run=pipeline_run),
            [
                (22 * 3600.0),
                1.0,
                2.0,
                3.0,
                4.0,
                5.0,
                6.0,
            ],
        )

        self.assertEqual(
            pipeline_schedule.runtime_history(
                pipeline_run=pipeline_run,
                sample_size=3,
            ),
            [
                (22 * 3600.0),
                1.0,
                2.0,
            ],
        )

    def test_runtime_average(self):
        pipeline_schedule = PipelineSchedule.create(
            name=self.faker.name(),
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.DAILY,
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
        )
        self.assertEqual(pipeline_schedule.runtime_average(), None)

        created_at = datetime(2023, 12, 10, 0, 0, 0)
        completed_at = datetime(2023, 12, 10, 9, 0, 0)
        execution_date = datetime(2023, 12, 11, 23, 59, 59)
        pipeline_run = PipelineRun.create(
            completed_at=completed_at,
            created_at=created_at,
            execution_date=execution_date,
            metrics=dict(
                previous_runtimes=[
                    1 * 3600.0,
                    2 * 3600.0,
                    3 * 3600.0,
                    4 * 3600.0,
                    5 * 3600.0,
                    6 * 3600.0,
                    7 * 3600.0,
                    8 * 3600.0,
                ]
            ),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
            variables=pipeline_schedule.variables,
        )
        self.assertEqual(
            pipeline_schedule.runtime_average(
                pipeline_run=pipeline_run,
            ),
            15428.57,
        )

        self.assertEqual(
            pipeline_schedule.runtime_average(
                pipeline_run=pipeline_run,
                sample_size=5,
            ),
            13680.0,
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_current_execution_date(self):
        now = datetime.now(timezone.utc)
        shared_attrs = dict(
            pipeline_uuid='test_pipeline',
            schedule_type=ScheduleType.TIME,
        )

        self.assertEqual(
            PipelineSchedule.create(
                name=self.faker.name(), **shared_attrs
            ).current_execution_date(),
            None,
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.ONCE,
                    ),
                )
            ).current_execution_date(),
            datetime(2023, 10, 11, 12, 13, 14).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.HOURLY,
                    ),
                )
            ).current_execution_date(),
            datetime(2023, 10, 11, 12, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.DAILY,
                    ),
                )
            ).current_execution_date(),
            datetime(2023, 10, 11, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.WEEKLY,
                    ),
                )
            ).current_execution_date(),
            datetime(2023, 10, 9, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.MONTHLY,
                    ),
                )
            ).current_execution_date(),
            datetime(2023, 10, 1, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        cron_itr = croniter('* * * * *', now)
        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval='* * * * *',
                    ),
                )
            ).current_execution_date(),
            cron_itr.get_prev(datetime),
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_current_execution_date_when_landing_time_enabled(self):
        now = datetime.now(timezone.utc)
        shared_attrs = dict(
            pipeline_uuid='test_pipeline',
            schedule_interval='@once',
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
            start_time=datetime(2024, 11, 12, 13, 14, 15).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                name=self.faker.name(), **shared_attrs
            ).current_execution_date(),
            now,
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.HOURLY,
                    ),
                )
            ).current_execution_date(),
            datetime(2023, 10, 11, 12, 14, 15).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.DAILY,
                    ),
                )
            ).current_execution_date(),
            datetime(2023, 10, 11, 13, 14, 15).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.WEEKLY,
                    ),
                )
            ).current_execution_date(),
            datetime(2023, 10, 10, 13, 14, 15).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.MONTHLY,
                    ),
                )
            ).current_execution_date(),
            datetime(2023, 10, 12, 13, 14, 15).replace(tzinfo=timezone.utc),
        )

        cron_itr = croniter('* * * * *', now)
        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval='* * * * *',
                    ),
                )
            ).current_execution_date(),
            cron_itr.get_prev(datetime),
        )

    @freeze_time('2023-08-19 20:10:15')
    def test_next_execution_date(self):
        now = datetime.now(timezone.utc)
        shared_attrs = dict(
            pipeline_uuid='test_pipeline2',
            schedule_interval='@once',
            schedule_type=ScheduleType.TIME,
            start_time=datetime(2023, 8, 19, 19, 14, 15).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                name=self.faker.name(), **shared_attrs
            ).next_execution_date(),
            None,
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.HOURLY,
                    ),
                )
            ).next_execution_date(),
            datetime(2023, 8, 19, 21, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.DAILY,
                    ),
                )
            ).next_execution_date(),
            datetime(2023, 8, 20, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.WEEKLY,
                    ),
                )
            ).next_execution_date(),
            datetime(2023, 8, 21, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval=ScheduleInterval.MONTHLY,
                    ),
                )
            ).next_execution_date(),
            datetime(2023, 9, 1, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        cron_itr = croniter('30 9 * 8 *', now)
        self.assertEqual(
            PipelineSchedule.create(
                **merge_dict(
                    shared_attrs,
                    dict(
                        name=self.faker.name(),
                        schedule_interval='30 9 * 8 *',
                    ),
                )
            ).next_execution_date(),
            cron_itr.get_next(datetime),
        )

    @freeze_time('2023-08-19 20:10:15')
    def test_should_schedule_always_on(self):
        pipeline_schedule = PipelineSchedule.create(
            name=self.faker.name(),
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.ALWAYS_ON,
            schedule_type=ScheduleType.TIME,
            start_time=datetime(2023, 8, 19, 19, 14, 15).replace(tzinfo=timezone.utc),
            status=ScheduleStatus.ACTIVE,
        )
        created_at = datetime(2023, 8, 19, 0, 0, 0)
        completed_at = datetime(2023, 8, 19, 9, 0, 0)
        execution_date = datetime(2023, 8, 19, 0, 0, 0)
        PipelineRun.create(
            completed_at=completed_at,
            created_at=created_at,
            execution_date=execution_date,
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )

        self.assertTrue(pipeline_schedule.should_schedule())

        PipelineRun.create(
            created_at=datetime(2023, 8, 19, 1, 0, 0),
            execution_date=datetime(2023, 8, 19, 1, 0, 0),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.RUNNING,
        )
        self.assertFalse(pipeline_schedule.should_schedule())

    def test_create_or_update_batch(self):
        create_pipeline_with_blocks(
            'test create or update batch',
            self.repo_path,
        )

        PipelineSchedule.create(
            **dict(
                name='test create batch trigger 3',
                pipeline_uuid='test_create_or_update_batch',
                schedule_type=ScheduleType.TIME,
                schedule_interval=ScheduleInterval.DAILY,
            )
        )

        trigger_configs = [
            Trigger.load(
                config=dict(
                    last_enabled_at=datetime(2024, 1, 1, 0, 0, 0),
                    name='test create batch trigger 1',
                    pipeline_uuid='test_create_or_update_batch',
                    schedule_type=ScheduleType.TIME,
                    start_time=datetime.now(),
                    schedule_interval=ScheduleInterval.HOURLY,
                    status=ScheduleStatus.ACTIVE,
                )
            ),
            Trigger.load(
                config=dict(
                    last_enabled_at=datetime(2024, 1, 1, 0, 0, 0),
                    name='test create batch trigger 2',
                    pipeline_uuid='test_create_or_update_batch',
                    schedule_type=ScheduleType.API,
                    start_time=datetime.now(),
                    schedule_interval=None,
                    status=ScheduleStatus.ACTIVE,
                )
            ),
            Trigger.load(
                config=dict(
                    last_enabled_at=datetime(2024, 1, 1, 0, 0, 0),
                    name='test create batch trigger 3',
                    pipeline_uuid='test_create_or_update_batch',
                    schedule_type=ScheduleType.TIME,
                    start_time=datetime.now(),
                    schedule_interval=ScheduleInterval.WEEKLY,
                    status=ScheduleStatus.ACTIVE,
                )
            ),
        ]

        PipelineSchedule.create_or_update_batch(trigger_configs)

        ps1 = PipelineSchedule.query.filter(
            PipelineSchedule.name == 'test create batch trigger 1'
        ).one_or_none()
        self.assertIsNotNone(ps1)
        self.assertEqual(ps1.schedule_type, ScheduleType.TIME)
        self.assertEqual(ps1.pipeline_uuid, 'test_create_or_update_batch')
        self.assertEqual(ps1.schedule_interval, ScheduleInterval.HOURLY)
        self.assertIsNotNone(ps1.token)

        ps3 = PipelineSchedule.query.filter(
            PipelineSchedule.name == 'test create batch trigger 3'
        ).one_or_none()
        self.assertEqual(ps3.schedule_type, ScheduleType.TIME)
        self.assertEqual(ps3.pipeline_uuid, 'test_create_or_update_batch')
        self.assertEqual(ps3.schedule_interval, ScheduleInterval.WEEKLY)


class PipelineRunTests(DBTestCase):
    def setUp(self):
        super().setUp()
        self.pipeline, self.blocks = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
            return_blocks=True,
        )
        self.block, self.block2, self.block3, self.block4 = self.blocks

    def tearDown(self):
        BlockRun.query.delete()
        self.pipeline.delete()
        super().tearDown()

    def test_block_runs_count(self):
        pipeline_run = create_pipeline_run(pipeline_uuid='test_pipeline')
        block_count = len(self.pipeline.get_executable_blocks())
        self.assertEqual(pipeline_run.block_runs_count, block_count)

    def test_executable_block_runs(self):
        pipeline_run = create_pipeline_run(pipeline_uuid='test_pipeline')
        block_runs1 = pipeline_run.executable_block_runs()
        self.assertEqual(len(block_runs1), 1)
        self.assertEqual(block_runs1[0].block_uuid, 'block1')

        block_runs1[0].update(status=BlockRun.BlockRunStatus.COMPLETED)
        block_runs2 = pipeline_run.executable_block_runs()
        self.assertEqual(len(block_runs2), 2)
        self.assertEqual(
            set([b.block_uuid for b in block_runs2]), set(['block2', 'block3'])
        )

        block_runs2[0].update(status=BlockRun.BlockRunStatus.COMPLETED)
        block_runs3 = pipeline_run.executable_block_runs()
        self.assertEqual(len(block_runs3), 1)
        self.assertEqual(block_runs3[0].block_uuid, block_runs2[1].block_uuid)

        block_runs2[1].update(status=BlockRun.BlockRunStatus.COMPLETED)
        block_runs4 = pipeline_run.executable_block_runs()
        self.assertEqual(len(block_runs4), 1)
        self.assertEqual(block_runs4[0].block_uuid, 'block4')

    def test_executable_block_runs_with_data_integration_blocks(self):
        block = Block.create(
            self.faker.unique.name(),
            'data_loader',
            self.pipeline.repo_path,
            language='yaml',
        )
        self.pipeline.add_block(block)

        pipeline_run = create_pipeline_run(
            pipeline_uuid=self.pipeline.uuid,
            create_block_runs=False,
        )
        data_integration_controller = BlockRun.create(
            block_uuid=f'{block.uuid}:controller',
            pipeline_run=pipeline_run,
            metrics=dict(
                original_block_uuid=block.uuid,
                controller=1,
            ),
        )
        data_integration_controller_child1 = BlockRun.create(
            block_uuid=f'{data_integration_controller.block_uuid}:child0',
            pipeline_run=pipeline_run,
            metrics=dict(
                original_block_uuid=block.uuid,
                controller_block_uuid=data_integration_controller.block_uuid,
                controller=1,
                child=1,
            ),
        )

        data_integration_controller_child2 = BlockRun.create(
            block_uuid=f'{data_integration_controller.block_uuid}:child1',
            pipeline_run=pipeline_run,
            metrics=dict(
                original_block_uuid=block.uuid,
                controller_block_uuid=data_integration_controller.block_uuid,
                controller=1,
                child=1,
                upstream_block_uuids=[
                    data_integration_controller_child1.block_uuid,
                ],
            ),
        )

        data_integration_child1 = BlockRun.create(
            block_uuid=f'{data_integration_controller_child1.block_uuid}:child0',
            pipeline_run=pipeline_run,
            metrics=dict(
                original_block_uuid=block.uuid,
                controller_block_uuid=data_integration_controller_child1.block_uuid,
                child=1,
            ),
        )

        data_integration_original = BlockRun.create(
            block_uuid=block.uuid,
            pipeline_run=pipeline_run,
            metrics=dict(
                original=1,
            ),
        )

        with patch(
            'mage_ai.data_preparation.models.project.Project.is_feature_enabled',
            lambda _x, feature_uuid: FeatureUUID.DATA_INTEGRATION_IN_BATCH_PIPELINE
            == feature_uuid,
        ):
            self.assertEqual(
                [br.block_uuid for br in pipeline_run.executable_block_runs()],
                [
                    data_integration_controller.block_uuid,
                    data_integration_controller_child1.block_uuid,
                    data_integration_child1.block_uuid,
                ],
            )

            data_integration_controller.update(status=BlockRun.BlockRunStatus.COMPLETED)

            self.assertEqual(
                [br.block_uuid for br in pipeline_run.executable_block_runs()],
                [
                    data_integration_controller_child1.block_uuid,
                    data_integration_child1.block_uuid,
                ],
            )

            data_integration_controller_child1.update(
                status=BlockRun.BlockRunStatus.COMPLETED
            )
            data_integration_child2 = BlockRun.create(
                block_uuid=f'{data_integration_controller_child2.block_uuid}:child1',
                pipeline_run=pipeline_run,
                metrics=dict(
                    original_block_uuid=block.uuid,
                    controller_block_uuid=data_integration_controller_child2.block_uuid,
                    child=1,
                ),
            )

            self.assertEqual(
                [br.block_uuid for br in pipeline_run.executable_block_runs()],
                [
                    data_integration_controller_child2.block_uuid,
                    data_integration_child1.block_uuid,
                    data_integration_child2.block_uuid,
                ],
            )

            data_integration_controller_child2.update(
                status=BlockRun.BlockRunStatus.COMPLETED
            )

            self.assertEqual(
                [br.block_uuid for br in pipeline_run.executable_block_runs()],
                [
                    data_integration_child1.block_uuid,
                    data_integration_child2.block_uuid,
                ],
            )

            data_integration_child1.update(status=BlockRun.BlockRunStatus.COMPLETED)

            self.assertEqual(
                [br.block_uuid for br in pipeline_run.executable_block_runs()],
                [
                    data_integration_child2.block_uuid,
                ],
            )

            data_integration_child2.update(status=BlockRun.BlockRunStatus.COMPLETED)

            self.assertEqual(
                [br.block_uuid for br in pipeline_run.executable_block_runs()],
                [
                    data_integration_original.block_uuid,
                ],
            )

    def test_executable_block_runs_for_dynamic_block(self):
        self.block2.configuration = dict(dynamic=True)
        self.pipeline.add_block(self.block2, upstream_block_uuids=[self.block.uuid])
        self.pipeline.add_block(self.block3, upstream_block_uuids=[self.block.uuid])

        pipeline_run = PipelineRun.create(
            pipeline_schedule_id=0,
            pipeline_uuid=self.pipeline.uuid,
            create_block_runs=False,
        )
        block_run1 = BlockRun.create(
            block_uuid=self.block.uuid,
            pipeline_run_id=pipeline_run.id,
        )
        block_run2 = BlockRun.create(
            block_uuid=self.block2.uuid,
            pipeline_run_id=pipeline_run.id,
        )
        block_run3 = BlockRun.create(
            block_uuid=self.block3.uuid,
            pipeline_run_id=pipeline_run.id,
        )

        self.assertEqual(
            sorted([br.id for br in pipeline_run.executable_block_runs()]),
            sorted([block_run1.id]),
        )
        block_run1.update(status=BlockRun.BlockRunStatus.COMPLETED)
        self.assertEqual(
            sorted([br.id for br in pipeline_run.executable_block_runs()]),
            sorted([block_run2.id, block_run3.id]),
        )

    def test_executable_block_runs_with_hook_blocks(self):
        _global_hooks, _hooks, hooks_match, _hooks_miss = build_hooks(
            self, self.pipeline
        )

        hook = hooks_match[0]
        hook.uuid = f'{hook.uuid}-{uuid4().hex}'

        pipeline_run = PipelineRun.create(
            pipeline_schedule_id=0,
            pipeline_uuid=self.pipeline.uuid,
            create_block_runs=False,
        )
        BlockRun.create(
            block_uuid=hook.uuid,
            pipeline_run_id=pipeline_run.id,
        )
        block_run_hook = BlockRun.create(
            block_uuid=hook.uuid,
            pipeline_run_id=pipeline_run.id,
            metrics=dict(hook=hook.to_dict(include_all=True)),
        )

        self.assertEqual(
            sorted([br.id for br in pipeline_run.executable_block_runs()]),
            sorted([block_run_hook.id]),
        )

        self.pipeline.add_block(self.block, upstream_block_uuids=None)
        self.pipeline.add_block(self.block2, upstream_block_uuids=[self.block.uuid])

        block_run1 = BlockRun.create(
            block_uuid=self.block.uuid,
            pipeline_run_id=pipeline_run.id,
            metrics=dict(upstream_blocks=[hook.uuid]),
        )
        block_run2 = BlockRun.create(
            block_uuid=self.block2.uuid,
            pipeline_run_id=pipeline_run.id,
        )

        self.assertEqual(
            sorted([br.id for br in pipeline_run.executable_block_runs()]),
            sorted([block_run_hook.id]),
        )

        block_run_hook.update(status=BlockRun.BlockRunStatus.COMPLETED)
        self.assertEqual(
            sorted([br.id for br in pipeline_run.executable_block_runs()]),
            sorted(
                [
                    block_run1.id,
                ]
            ),
        )

        block_run1.update(status=BlockRun.BlockRunStatus.COMPLETED)
        self.assertEqual(
            sorted([br.id for br in pipeline_run.executable_block_runs()]),
            sorted(
                [
                    block_run2.id,
                ]
            ),
        )

    def test_execution_partition(self):
        execution_date = datetime.now()
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline',
            execution_date=execution_date,
        )
        execution_date_str = execution_date.strftime(format='%Y%m%dT%H%M%S')
        self.assertEqual(
            pipeline_run.execution_partition,
            f'{pipeline_run.pipeline_schedule_id}/{execution_date_str}',
        )

    @freeze_time('2023-05-01 01:20:33')
    def test_execution_partition_from_variables(self):
        pipeline_schedule = PipelineSchedule.create(
            name=self.faker.name(),
            pipeline_uuid='test_pipeline',
        )
        payload = configure_pipeline_run_payload(
            pipeline_schedule, PipelineType.PYTHON, dict()
        )[0]
        pipeline_run = PipelineRun.create(**payload)
        execution_date_str = datetime.utcnow().strftime(format='%Y%m%dT%H%M%S_%f')
        self.assertEqual(
            pipeline_run.execution_partition,
            f'{pipeline_run.pipeline_schedule_id}/{execution_date_str}',
        )

    def test_log_file(self):
        execution_date = datetime.now()
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline',
            execution_date=execution_date,
        )
        execution_date_str = execution_date.strftime(format='%Y%m%dT%H%M%S')
        execution_date_str = execution_date.strftime(format='%Y%m%dT%H%M%S')
        expected_file_path1 = os.path.join(
            get_repo_config(self.repo_path).variables_dir,
            'pipelines/test_pipeline/.logs',
            f'{pipeline_run.pipeline_schedule_id}/{execution_date_str}/pipeline.log',
        )
        expected_file_path2 = os.path.join(
            get_repo_config(self.repo_path).variables_dir,
            'pipelines/test_pipeline/.logs',
            f'{pipeline_run.pipeline_schedule_id}/{execution_date_str}/scheduler.log',
        )
        self.assertEqual(pipeline_run.logs[0].get('path'), expected_file_path1)
        self.assertEqual(pipeline_run.logs[1].get('path'), expected_file_path2)

    def test_active_runs_for_pipelines(self):
        create_pipeline_with_blocks(
            'test active run 1',
            self.repo_path,
        )
        create_pipeline_with_blocks(
            'test active run 2',
            self.repo_path,
        )
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_active_run_1',
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        pipeline_schedule = pipeline_run.pipeline_schedule
        pipeline_run2 = create_pipeline_run_with_schedule(
            pipeline_uuid='test_active_run_1',
            pipeline_schedule_id=pipeline_schedule.id,
        )
        pipeline_run2.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        create_pipeline_run_with_schedule(
            pipeline_uuid='test_active_run_1',
            pipeline_schedule_id=pipeline_schedule.id,
        )
        pipeline_run4 = create_pipeline_run_with_schedule(
            pipeline_uuid='test_active_run_2',
        )
        pipeline_run4.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        results1 = PipelineRun.active_runs_for_pipelines(
            pipeline_uuids=['test_active_run_1'],
            include_block_runs=True,
        )
        results2 = PipelineRun.active_runs_for_pipelines(
            pipeline_uuids=['test_active_run_2'],
            include_block_runs=True,
        )
        results3 = PipelineRun.active_runs_for_pipelines(
            pipeline_uuids=['test_active_run_1', 'test_active_run_2'],
            include_block_runs=True,
        )
        self.assertEqual(
            set([r.id for r in results1]),
            set([pipeline_run.id, pipeline_run2.id]),
        )
        self.assertEqual(set([r.id for r in results2]), set([pipeline_run4.id]))
        self.assertEqual(
            set([r.id for r in results3]),
            set([pipeline_run.id, pipeline_run2.id, pipeline_run4.id]),
        )

    def test_active_runs_for_pipelines_grouped(self):
        create_pipeline_with_blocks(
            'test active run grouped 1',
            self.repo_path,
        )
        create_pipeline_with_blocks(
            'test active run grouped 2',
            self.repo_path,
        )
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_active_run_grouped_1',
        )
        pipeline_run.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        pipeline_schedule = pipeline_run.pipeline_schedule
        pipeline_run2 = create_pipeline_run_with_schedule(
            pipeline_uuid='test_active_run_grouped_2',
        )
        pipeline_schedule2 = pipeline_run2.pipeline_schedule
        pipeline_run2.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        create_pipeline_run_with_schedule(
            pipeline_uuid='test_active_run_grouped_1',
            pipeline_schedule_id=pipeline_schedule.id,
        )
        pipeline_run3 = create_pipeline_run_with_schedule(
            pipeline_uuid='test_active_run_grouped_1',
            pipeline_schedule_id=pipeline_schedule.id,
        )
        pipeline_run3.update(status=PipelineRun.PipelineRunStatus.RUNNING)
        pipeline_run4 = create_pipeline_run_with_schedule(
            pipeline_uuid='test_active_run_grouped_2',
            pipeline_schedule_id=pipeline_schedule2.id,
        )
        pipeline_run4.update(status=PipelineRun.PipelineRunStatus.RUNNING)

        results1 = PipelineRun.active_runs_for_pipelines_grouped(
            pipeline_uuids=['test_active_run_grouped_1'],
        )
        results2 = PipelineRun.active_runs_for_pipelines_grouped(
            pipeline_uuids=['test_active_run_grouped_2'],
        )
        results3 = PipelineRun.active_runs_for_pipelines_grouped(
            pipeline_uuids=['test_active_run_grouped_1', 'test_active_run_grouped_2'],
        )
        self.assertEqual(len(results1), 1)
        self.assertEqual(
            set([r.id for r in results1['test_active_run_grouped_1']]),
            set([pipeline_run.id, pipeline_run3.id]),
        )
        self.assertEqual(len(results2), 1)
        self.assertEqual(
            set([r.id for r in results2['test_active_run_grouped_2']]),
            set([pipeline_run2.id, pipeline_run4.id]),
        )
        self.assertEqual(len(results3), 2)
        self.assertEqual(
            set([r.id for r in results3['test_active_run_grouped_1']]),
            set([pipeline_run.id, pipeline_run3.id]),
        )
        self.assertEqual(
            set([r.id for r in results3['test_active_run_grouped_2']]),
            set([pipeline_run2.id, pipeline_run4.id]),
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_get_variables_intervals_for_cron(self):
        pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline.uuid,
            schedule_interval='*/10 * * * *',
            schedule_type=ScheduleType.TIME,
        )

        pipeline_run = PipelineRun.create(
            pipeline_uuid=self.pipeline.uuid,
            pipeline_schedule_id=pipeline_schedule.id,
            create_block_runs=False,
            execution_date=pipeline_schedule.current_execution_date(),
        )

        variables = pipeline_run.get_variables(pipeline_uuid=pipeline_run.pipeline_uuid)

        self.assertEqual(
            datetime(2023, 10, 11, 12, 20, 0) - variables['interval_end_datetime'],
            timedelta(0),
        )
        self.assertEqual(600, variables['interval_seconds'])
        self.assertEqual(
            datetime(2023, 10, 11, 12, 10, 0) - variables['interval_start_datetime'],
            timedelta(0),
        )
        self.assertEqual(
            datetime(2023, 10, 11, 12, 0, 0) - variables['interval_start_datetime_previous'],
            timedelta(0),
        )


class BlockRunTests(DBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
        )

    def test_log_file(self):
        execution_date = datetime.now()
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline',
            execution_date=execution_date,
        )
        execution_date_str = execution_date.strftime(format='%Y%m%dT%H%M%S')
        for b in pipeline_run.block_runs:
            expected_file_path = os.path.join(
                get_repo_config(self.repo_path).variables_dir,
                'pipelines/test_pipeline/.logs',
                f'{pipeline_run.pipeline_schedule_id}/{execution_date_str}/{b.block_uuid}.log',
            )
            self.assertEqual(b.logs.get('path'), expected_file_path)


@patch(
    'mage_ai.orchestration.db.models.schedules.project_platform_activated',
    lambda: True,
)
class PipelineScheduleProjectPlatformTests(ProjectPlatformMixin):
    def test_repo_query(self):
        with patch(
            'mage_ai.orchestration.db.models.schedules.project_platform_activated',
            lambda: False,
        ):
            # pipeline_schedule1 = PipelineSchedule.create(
            #     name='test pipeline',
            #     pipeline_uuid=self.pipeline.uuid,
            #     repo_path=base_repo_path(),
            # )
            pipeline_schedule2 = PipelineSchedule.create(
                name='test pipeline',
                pipeline_uuid=self.pipeline.uuid,
                repo_path=None,
            )

            ids = [ps.id for ps in PipelineSchedule.repo_query.all()]

            # self.assertIn(pipeline_schedule1.id, ids)
            self.assertIn(pipeline_schedule2.id, ids)

        with patch(
            'mage_ai.orchestration.db.models.schedules.project_platform_activated',
            lambda: True,
        ):
            arr = []
            for settings in self.repo_paths.values():
                arr.append(PipelineSchedule.create(
                    name='test pipeline',
                    pipeline_uuid='mage',
                    repo_path=settings['full_path'],
                ))

            ids = [ps.id for ps in PipelineSchedule.repo_query.all()]

            for ps in arr:
                self.assertIn(ps.id, ids)

    def test_pipeline(self):
        with patch(
            'mage_ai.orchestration.db.models.schedules_project_platform.get_pipeline_from_platform',
        ) as mock:
            pipeline_uuid = self.faker.unique.name()
            repo_path = self.faker.unique.name()

            PipelineSchedule(
                pipeline_uuid=pipeline_uuid,
                repo_path=repo_path,
            ).pipeline

            mock.assert_called_once_with(
                pipeline_uuid,
                check_if_exists=True,
                repo_path=repo_path,
            )


@patch(
    'mage_ai.orchestration.db.models.schedules.project_platform_activated',
    lambda: True,
)
class PipelineRunProjectPlatformTests(ProjectPlatformMixin, AsyncDBTestCase):
    def test_pipeline(self):
        pipeline_uuid = self.faker.unique.name()
        repo_path = self.faker.unique.name()

        pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=pipeline_uuid,
            repo_path=repo_path,
        )

        pipeline_run = PipelineRun.create(
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
            create_block_runs=False,
        )

        with patch(
            'mage_ai.orchestration.db.models.schedules_project_platform.get_pipeline_from_platform',
        ) as mock:
            pipeline_run.pipeline

            mock.assert_called_once_with(
                pipeline_uuid,
                repo_path=repo_path,
            )

    async def test_logs_async(self):
        value = self.faker.unique.name()
        pipeline = Mock()
        pipeline.repo_config = value

        pipeline_uuid = self.faker.unique.name()
        repo_path = self.faker.unique.name()

        pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=pipeline_uuid,
            repo_path=repo_path,
        )

        pipeline_run = PipelineRun.create(
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
            create_block_runs=False,
        )

        async def __get_pipeline_from_platform_async(
            pipeline_uuid: str,
            repo_path: str,
            pipeline=pipeline,
            pipeline_uuid_test=pipeline_uuid,
            repo_path_test=repo_path,
        ):
            self.assertEqual(pipeline_uuid, pipeline_uuid_test)
            self.assertEqual(repo_path, repo_path_test)

            return pipeline

        class FakeLoggerManager:
            async def get_logs_async(cls):
                with open(os.path.join(self.repo_path, 'test.log'), 'w') as f:
                    f.write('test')

        fake_logger_manager = FakeLoggerManager()

        class FakeLoggerManagerFactory:
            @classmethod
            def get_logger_manager(
                cls,
                pipeline_uuid: str = None,
                filename: str = None,
                partition: str = None,
                repo_config: str = None,
            ):
                self.assertEqual(pipeline_uuid, pipeline_run.pipeline_uuid)
                self.assertEqual(partition, pipeline_run.execution_partition)
                self.assertEqual(repo_config, value)

                return fake_logger_manager

        with patch(
            'mage_ai.orchestration.db.models.schedules_project_platform.'
            'get_pipeline_from_platform_async',
            __get_pipeline_from_platform_async,
        ):
            with patch(
                'mage_ai.orchestration.db.models.schedules_project_platform.LoggerManagerFactory',
                FakeLoggerManagerFactory,
            ):
                await pipeline_run.logs_async()

                with open(os.path.join(self.repo_path, 'test.log'), 'r') as f:
                    self.assertEqual(f.read(), 'test')

    def test_get_variables(self):
        pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=self.pipeline.uuid,
        )

        pipeline_run = PipelineRun.create(
            pipeline_uuid=self.pipeline.uuid,
            pipeline_schedule_id=pipeline_schedule.id,
            create_block_runs=False,
        )

        with patch(
            'mage_ai.orchestration.db.models.schedules_project_platform.get_global_variables',
            wraps=lambda pipeline_uuid, pipeline: {},
        ) as mock:
            with patch(
                'mage_ai.data_preparation.models.pipeline.project_platform_activated',
                lambda: True,
            ):
                pipeline_run.get_variables(pipeline_uuid=pipeline_run.pipeline_uuid)
                self.assertEqual(mock.mock_calls[0][1][0], pipeline_run.pipeline_uuid)
                self.assertEqual(mock.mock_calls[0][2]['pipeline'].uuid, pipeline_run.pipeline_uuid)


@patch(
    'mage_ai.orchestration.db.models.schedules.project_platform_activated',
    lambda: True,
)
class BlockRunProjectPlatformTests(ProjectPlatformMixin, AsyncDBTestCase):
    async def test_logs_async(self):
        value = self.faker.unique.name()
        pipeline_uuid = self.faker.unique.name()

        pipeline = Mock()
        pipeline.uuid = pipeline_uuid
        pipeline.repo_config = value

        repo_path = self.faker.unique.name()

        pipeline_schedule = PipelineSchedule.create(
            name=self.faker.unique.name(),
            pipeline_uuid=pipeline_uuid,
            repo_path=repo_path,
        )

        pipeline_run = PipelineRun.create(
            pipeline_uuid=pipeline_uuid,
            pipeline_schedule_id=pipeline_schedule.id,
            create_block_runs=False,
        )

        block_uuid_value = 'mage_fire'
        block_run = BlockRun.create(
            block_uuid=block_uuid_value,
            pipeline_run=pipeline_run,
        )

        async def __get_pipeline_from_platform_async(
            pipeline_uuid: str,
            repo_path: str,
            pipeline=pipeline,
            pipeline_uuid_test=pipeline_uuid,
            repo_path_test=repo_path,
        ):
            self.assertEqual(pipeline_uuid, pipeline_uuid_test)
            self.assertEqual(repo_path, repo_path_test)

            return pipeline

        class FakeLoggerManager:
            async def get_logs_async(cls):
                with open(os.path.join(self.repo_path, 'test.log'), 'w') as f:
                    f.write('test')

        fake_logger_manager = FakeLoggerManager()

        class FakeLoggerManagerFactory:
            @classmethod
            def get_logger_manager(
                cls,
                pipeline_uuid: str,
                block_uuid: str,
                partition: str,
                repo_config: str,
            ):
                self.assertEqual(pipeline_uuid, pipeline_run.pipeline_uuid)
                self.assertEqual(block_uuid, block_uuid_value)
                self.assertEqual(partition, pipeline_run.execution_partition)
                self.assertEqual(repo_config, value)

                return fake_logger_manager

        with patch(
            'mage_ai.orchestration.db.models.schedules_project_platform.' +
            'get_pipeline_from_platform_async',
            __get_pipeline_from_platform_async,
        ):
            with patch(
                'mage_ai.orchestration.db.models.schedules_project_platform.LoggerManagerFactory',
                FakeLoggerManagerFactory,
            ):
                await block_run.logs_async()

                with open(os.path.join(self.repo_path, 'test.log'), 'r') as f:
                    self.assertEqual(f.read(), 'test')
