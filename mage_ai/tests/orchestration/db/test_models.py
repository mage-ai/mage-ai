from datetime import datetime
from mage_ai.orchestration.db.models import (
    PipelineSchedule,
)
from mage_ai.tests.base_test import TestCase
from mage_ai.tests.factory import (
    create_pipeline_run,
    create_pipeline_run_with_schedule,
    create_pipeline_with_blocks,
)
import os


class PipelineScheduleTests(TestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
        )

    def test_pipeline_runs_count(self):
        pipeline_schedule = PipelineSchedule.create(pipeline_uuid='test_pipeline')
        for i in range(5):
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

    def test_should_schedule(self):
        pipeline_schedule1 = PipelineSchedule.create(
            pipeline_uuid='test_pipeline',
            schedule_interval='@daily'
        )
        pipeline_schedule2 = PipelineSchedule.create(
            pipeline_uuid='test_pipeline',
            schedule_interval='@daily'
        )
        pipeline_schedule2.update(status=PipelineSchedule.ScheduleStatus.ACTIVE)
        self.assertFalse(pipeline_schedule1.should_schedule())
        self.assertTrue(pipeline_schedule2.should_schedule())


class PielineRunTests(TestCase):
    @classmethod
    def setUpClass(self):
        super().setUpClass()
        self.pipeline = create_pipeline_with_blocks(
            'test pipeline',
            self.repo_path,
        )

    def block_runs_count(self):
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

    def test_log_file(self):
        execution_date = datetime.now()
        pipeline_run = create_pipeline_run_with_schedule(
            pipeline_uuid='test_pipeline',
            execution_date=execution_date,
        )
        execution_date_str = execution_date.strftime(format='%Y%m%dT%H%M%S')
        expected_file_path = os.path.join(
            self.__class__.repo_path,
            'pipelines/test_pipeline/.logs',
            f'{pipeline_run.pipeline_schedule_id}/{execution_date_str}/pipeline.log',
        )
        self.assertEquals(pipeline_run.log_file.file_path, expected_file_path)


class BlockRunTests(TestCase):
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
                self.__class__.repo_path,
                'pipelines/test_pipeline/.logs',
                f'{pipeline_run.pipeline_schedule_id}/{execution_date_str}/{b.block_uuid}.log',
            )
            self.assertEquals(b.log_file.file_path, expected_file_path)
