import os
from datetime import datetime, timezone

from croniter import croniter
from freezegun import freeze_time

from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
)
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.orchestration.db.models.schedules import (
    BlockRun,
    PipelineRun,
    PipelineSchedule,
)
from mage_ai.orchestration.pipeline_scheduler import configure_pipeline_run_payload
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.base_test import DBTestCase
from mage_ai.tests.factory import (
    create_pipeline_run,
    create_pipeline_run_with_schedule,
    create_pipeline_with_blocks,
)


class PipelineScheduleTests(DBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
        )

    def test_pipeline_runs_count(self):
        pipeline_schedule = PipelineSchedule.create(pipeline_uuid='test_pipeline')
        for _ in range(5):
            create_pipeline_run_with_schedule(
                'test_pipeline',
                pipeline_schedule_id=pipeline_schedule.id,
            )
        self.assertEqual(pipeline_schedule.pipeline_runs_count, 5)

    def test_validate_schedule_interval(self):
        PipelineSchedule.create(
            pipeline_uuid='test_pipeline',
            schedule_interval='@daily'
        )
        PipelineSchedule.create(
            pipeline_uuid='test_pipeline',
            schedule_interval='* * * * *'
        )
        with self.assertRaises(ValueError) as context:
            PipelineSchedule.create(
                pipeline_uuid='test_pipeline',
                schedule_interval='random_str'
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
            pipeline_uuid='test_active_schedule_1',
            schedule_interval='@daily'
        )
        pipeline_schedule2 = PipelineSchedule.create(
            pipeline_uuid='test_active_schedule_1',
            schedule_interval='@daily'
        )
        pipeline_schedule3 = PipelineSchedule.create(
            pipeline_uuid='test_active_schedule_2',
            schedule_interval='@daily'
        )
        PipelineSchedule.create(
            pipeline_uuid='test_active_schedule_2',
            schedule_interval='@daily'
        )
        pipeline_schedule2.update(status=ScheduleStatus.ACTIVE)
        pipeline_schedule3.update(status=ScheduleStatus.ACTIVE)
        results1 = PipelineSchedule.active_schedules(pipeline_uuids=['test_active_schedule_1'])
        results2 = PipelineSchedule.active_schedules(pipeline_uuids=['test_active_schedule_2'])
        results3 = PipelineSchedule.active_schedules()
        self.assertEqual(set([r.id for r in results1]), set([pipeline_schedule2.id]))
        self.assertEqual(set([r.id for r in results2]), set([pipeline_schedule3.id]))
        self.assertEqual(
            set([r.id for r in results3]),
            set([pipeline_schedule2.id, pipeline_schedule3.id]),
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_should_schedule(self):
        shared_attrs = dict(
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.DAILY,
            schedule_type=ScheduleType.TIME,
        )

        self.assertFalse(PipelineSchedule.create(**shared_attrs).should_schedule())

        self.assertFalse(PipelineSchedule.create(**merge_dict(shared_attrs, dict(
            start_time=datetime(2023, 10, 11, 12, 13, 15),
            status=ScheduleStatus.ACTIVE,
        ))).should_schedule())

        self.assertFalse(PipelineSchedule.create(**merge_dict(shared_attrs, dict(
            pipeline_uuid='does_not_exist',
            start_time=datetime(2023, 10, 11, 12, 13, 13),
            status=ScheduleStatus.ACTIVE,
        ))).should_schedule())

        pipeline_schedule1 = PipelineSchedule.create(**merge_dict(shared_attrs, dict(
            schedule_interval=ScheduleInterval.ONCE,
            start_time=datetime(2023, 10, 11, 12, 13, 13),
            status=ScheduleStatus.ACTIVE,
        )))
        self.assertTrue(pipeline_schedule1.should_schedule())
        PipelineRun.create(
            pipeline_schedule_id=pipeline_schedule1.id,
            pipeline_uuid=pipeline_schedule1.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )
        self.assertFalse(pipeline_schedule1.should_schedule())

        self.assertFalse(PipelineSchedule.create(**merge_dict(shared_attrs, dict(
            schedule_interval=None,
            status=ScheduleStatus.ACTIVE
        ))).should_schedule())

        self.assertTrue(PipelineSchedule.create(**merge_dict(shared_attrs, dict(
            status=ScheduleStatus.ACTIVE
        ))).should_schedule())

        for schedule_interval, execution_date_true, execution_date_false in [
            (
                ScheduleInterval.HOURLY,
                datetime(2023, 10, 11, 11, 0, 0),
                datetime(2023, 10, 11, 12, 0, 0),
            ),
            (
                ScheduleInterval.DAILY,
                datetime(2023, 10, 10, 0, 0, 0),
                datetime(2023, 10, 11, 0, 0, 0),
            ),
            (
                ScheduleInterval.WEEKLY,
                datetime(2023, 10, 2, 0, 0, 0),
                datetime(2023, 10, 9, 0, 0, 0),
            ),
            (
                ScheduleInterval.MONTHLY,
                datetime(2023, 9, 1, 0, 0, 0),
                datetime(2023, 10, 1, 0, 0, 0),
            ),
        ]:
            pipeline_schedule_false = PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=schedule_interval,
                # Set the start time to one second ago
                start_time=datetime(2023, 10, 11, 12, 13, 13),
                status=ScheduleStatus.ACTIVE,
            )))
            self.assertFalse(pipeline_schedule_false.should_schedule())

            pipeline_schedule = PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=schedule_interval,
                # Set the start time to one month ago
                start_time=datetime(2023, 9, 11, 12, 13, 13),
                status=ScheduleStatus.ACTIVE,
            )))
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

    @freeze_time('2023-10-11 12:13:14')
    def test_should_schedule_when_landing_time_enabled(self):
        shared_attrs = dict(
            pipeline_uuid='test_pipeline',
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
            status=ScheduleStatus.ACTIVE,
        )

        # No previous runtimes
        self.assertTrue(PipelineSchedule.create(**merge_dict(shared_attrs, dict(
            schedule_interval=ScheduleInterval.HOURLY,
        ))).should_schedule())

        for schedule_interval, previous_runtimes, landing_time_true, landing_time_false in [
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
            self.assertTrue(PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=schedule_interval,
                start_time=landing_time_true,
            ))).should_schedule(previous_runtimes=previous_runtimes))
            self.assertFalse(PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=schedule_interval,
                start_time=landing_time_false,
            ))).should_schedule(previous_runtimes=previous_runtimes))

    def test_landing_time_enabled(self):
        for schedule_type in [
            ScheduleType.API,
            ScheduleType.EVENT,
        ]:
            self.assertFalse(PipelineSchedule.create(
                pipeline_uuid='test_pipeline',
                schedule_interval=ScheduleInterval.HOURLY,
                schedule_type=schedule_type,
                settings=dict(landing_time_enabled=True),
            ).landing_time_enabled())

        for schedule_interval in [
            '* * * * *',
            ScheduleInterval.ONCE,
        ]:
            self.assertFalse(PipelineSchedule.create(
                pipeline_uuid='test_pipeline',
                schedule_interval=schedule_interval,
                schedule_type=ScheduleType.TIME,
                settings=dict(landing_time_enabled=True),
            ).landing_time_enabled())

        self.assertFalse(PipelineSchedule.create(
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.HOURLY,
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=False),
        ).landing_time_enabled())

        self.assertFalse(PipelineSchedule.create(
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.HOURLY,
            schedule_type=ScheduleType.TIME,
            settings={},
        ).landing_time_enabled())

        self.assertTrue(PipelineSchedule.create(
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.HOURLY,
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
        ).landing_time_enabled())

    @freeze_time('2023-12-10 12:00:00')
    def test_runtime_history(self):
        pipeline_schedule = PipelineSchedule.create(
            pipeline_uuid='test_pipeline',
            schedule_interval=ScheduleInterval.DAILY,
            schedule_type=ScheduleType.TIME,
            settings=dict(landing_time_enabled=True),
        )
        self.assertEqual(pipeline_schedule.runtime_history(), [])

        pipeline_schedule2 = PipelineSchedule.create(
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

        self.assertEqual(pipeline_schedule.runtime_history(), [
            (5 * 3600.0),
            (4 * 3600.0),
            (3 * 3600.0),
            (1 * 3600.0),
            (2 * 3600.0),
            (6 * 3600.0),
            (7 * 3600.0),
        ])

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

        self.assertEqual(pipeline_schedule.runtime_history(pipeline_run=pipeline_run), [
            (23 * 3600.0),
            (5 * 3600.0),
            (4 * 3600.0),
            (3 * 3600.0),
            (1 * 3600.0),
            (2 * 3600.0),
            (6 * 3600.0),
        ])
        self.assertEqual(pipeline_schedule.runtime_history(
            pipeline_run=pipeline_run,
            sample_size=5,
        ), [
            (23 * 3600.0),
            (5 * 3600.0),
            (4 * 3600.0),
            (3 * 3600.0),
            (1 * 3600.0),
        ])

        created_at = datetime(2023, 12, 10, 0, 0, 0)
        completed_at = datetime(2023, 12, 10, 22, 0, 0)
        execution_date = datetime(2023, 12, 11, 23, 59, 59)
        pipeline_run = PipelineRun.create(
            completed_at=completed_at,
            created_at=created_at,
            execution_date=execution_date,
            metrics=dict(previous_runtimes=[
                1.0,
                2.0,
                3.0,
                4.0,
                5.0,
                6.0,
                7.0,
                8.0,
            ]),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
            variables=pipeline_schedule.variables,
        )

        self.assertEqual(pipeline_schedule.runtime_history(pipeline_run=pipeline_run), [
            (22 * 3600.0),
            1.0,
            2.0,
            3.0,
            4.0,
            5.0,
            6.0,
        ])

        self.assertEqual(pipeline_schedule.runtime_history(
            pipeline_run=pipeline_run,
            sample_size=3,
        ), [
            (22 * 3600.0),
            1.0,
            2.0,
        ])

    def test_runtime_average(self):
        pipeline_schedule = PipelineSchedule.create(
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
            metrics=dict(previous_runtimes=[
                1 * 3600.0,
                2 * 3600.0,
                3 * 3600.0,
                4 * 3600.0,
                5 * 3600.0,
                6 * 3600.0,
                7 * 3600.0,
                8 * 3600.0,
            ]),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=pipeline_schedule.pipeline_uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
            variables=pipeline_schedule.variables,
        )
        self.assertEqual(pipeline_schedule.runtime_average(
            pipeline_run=pipeline_run,
        ), 15428.57)

        self.assertEqual(pipeline_schedule.runtime_average(
            pipeline_run=pipeline_run,
            sample_size=5,
        ), 13680.0)

    @freeze_time('2023-10-11 12:13:14')
    def test_current_execution_date(self):
        now = datetime.now(timezone.utc)
        shared_attrs = dict(
            pipeline_uuid='test_pipeline',
            schedule_type=ScheduleType.TIME,
        )

        self.assertEqual(PipelineSchedule.create(**shared_attrs).current_execution_date(), None)

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.ONCE,
            ))).current_execution_date(),
            datetime(2023, 10, 11, 12, 13, 14).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.HOURLY,
            ))).current_execution_date(),
            datetime(2023, 10, 11, 12, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.DAILY,
            ))).current_execution_date(),
            datetime(2023, 10, 11, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.WEEKLY,
            ))).current_execution_date(),
            datetime(2023, 10, 9, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.MONTHLY,
            ))).current_execution_date(),
            datetime(2023, 10, 1, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        cron_itr = croniter('* * * * *', now)
        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval='* * * * *',
            ))).current_execution_date(),
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

        self.assertEqual(PipelineSchedule.create(**shared_attrs).current_execution_date(), now)

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.HOURLY,
            ))).current_execution_date(),
            datetime(2023, 10, 11, 12, 14, 15).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.DAILY,
            ))).current_execution_date(),
            datetime(2023, 10, 11, 13, 14, 15).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.WEEKLY,
            ))).current_execution_date(),
            datetime(2023, 10, 10, 13, 14, 15).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.MONTHLY,
            ))).current_execution_date(),
            datetime(2023, 10, 12, 13, 14, 15).replace(tzinfo=timezone.utc),
        )

        cron_itr = croniter('* * * * *', now)
        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval='* * * * *',
            ))).current_execution_date(),
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

        self.assertEqual(PipelineSchedule.create(**shared_attrs).next_execution_date(), None)

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.HOURLY,
            ))).next_execution_date(),
            datetime(2023, 8, 19, 21, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.DAILY,
            ))).next_execution_date(),
            datetime(2023, 8, 20, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.WEEKLY,
            ))).next_execution_date(),
            datetime(2023, 8, 21, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval=ScheduleInterval.MONTHLY,
            ))).next_execution_date(),
            datetime(2023, 9, 1, 0, 0, 0).replace(tzinfo=timezone.utc),
        )

        cron_itr = croniter('30 9 * 8 *', now)
        self.assertEqual(
            PipelineSchedule.create(**merge_dict(shared_attrs, dict(
                schedule_interval='30 9 * 8 *',
            ))).next_execution_date(),
            cron_itr.get_next(datetime),
        )


class PipelineRunTests(DBTestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
        )

    def test_block_runs_count(self):
        pipeline_run = create_pipeline_run(pipeline_uuid='test_pipeline')
        block_count = len(self.__class__.pipeline.get_executable_blocks())
        self.assertEqual(pipeline_run.block_runs_count, block_count)

    def test_executable_block_runs(self):
        pipeline_run = create_pipeline_run(pipeline_uuid='test_pipeline')
        block_runs1 = pipeline_run.executable_block_runs()
        self.assertEqual(len(block_runs1), 1)
        self.assertEqual(block_runs1[0].block_uuid, 'block1')

        block_runs1[0].update(status=BlockRun.BlockRunStatus.COMPLETED)
        block_runs2 = pipeline_run.executable_block_runs()
        self.assertEqual(len(block_runs2), 2)
        self.assertEqual(set([b.block_uuid for b in block_runs2]), set(['block2', 'block3']))

        block_runs2[0].update(status=BlockRun.BlockRunStatus.COMPLETED)
        block_runs3 = pipeline_run.executable_block_runs()
        self.assertEqual(len(block_runs3), 1)
        self.assertEqual(block_runs3[0].block_uuid, block_runs2[1].block_uuid)

        block_runs2[1].update(status=BlockRun.BlockRunStatus.COMPLETED)
        block_runs4 = pipeline_run.executable_block_runs()
        self.assertEqual(len(block_runs4), 1)
        self.assertEqual(block_runs4[0].block_uuid, 'block4')

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
        pipeline_schedule = PipelineSchedule.create(pipeline_uuid='test_pipeline')
        payload = configure_pipeline_run_payload(pipeline_schedule, PipelineType.PYTHON, dict())[0]
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
        expected_file_path = os.path.join(
            get_repo_config(self.repo_path).variables_dir,
            'pipelines/test_pipeline/.logs',
            f'{pipeline_run.pipeline_schedule_id}/{execution_date_str}/pipeline.log',
        )
        self.assertEqual(pipeline_run.logs.get('path'), expected_file_path)

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
