import os
from datetime import datetime

from freezegun import freeze_time

from mage_ai.data_preparation.models.constants import PipelineType
from mage_ai.data_preparation.models.triggers import ScheduleStatus
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

    def test_active_runs(self):
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
        results1 = PipelineRun.active_runs(
            pipeline_uuids=['test_active_run_1'],
            include_block_runs=True,
        )
        results2 = PipelineRun.active_runs(
            pipeline_uuids=['test_active_run_2'],
            include_block_runs=True,
        )
        results3 = PipelineRun.active_runs(
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
