import os
from datetime import datetime

from freezegun import freeze_time

from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.triggers import (
    ScheduleInterval,
    ScheduleStatus,
    ScheduleType,
)
from mage_ai.data_preparation.repo_manager import get_repo_config
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.orchestration.pipeline_scheduler import configure_pipeline_run_payload
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

    def test_should_schedule(self):
        pipeline_schedule1 = PipelineSchedule.create(
            pipeline_uuid='test_pipeline',
            schedule_interval='@daily'
        )
        pipeline_schedule2 = PipelineSchedule.create(
            pipeline_uuid='test_pipeline',
            schedule_interval='@daily'
        )
        pipeline_schedule2.update(status=ScheduleStatus.ACTIVE)
        self.assertFalse(pipeline_schedule1.should_schedule())
        self.assertTrue(pipeline_schedule2.should_schedule())

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
