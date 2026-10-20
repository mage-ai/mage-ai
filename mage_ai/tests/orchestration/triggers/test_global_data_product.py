import os
from datetime import datetime, timedelta, timezone

from freezegun import freeze_time

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.global_data_product import GlobalDataProduct
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule

# from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler, schedule_all
from mage_ai.orchestration.triggers.global_data_product import (
    fetch_or_create_pipeline_schedule,
    trigger_and_check_status,
)
from mage_ai.tests.base_test import DBTestCase

# from unittest.mock import patch


class TriggerGlobalDataProductTest(DBTestCase):
    def setUp(self):
        super().setUp()

        try:
            self.pipeline = Pipeline.create(
                'test pipeline',
                repo_path=self.repo_path,
            )
            self.pipeline.add_block(Block('data_loader', 'data_loader', BlockType.DATA_LOADER))
            self.pipeline.add_block(Block('transformer', 'transformer', BlockType.TRANSFORMER))
            self.pipeline.add_block(
                Block('data_exporter', 'data_exporter', BlockType.DATA_EXPORTER))
        except Exception:
            self.pipeline = Pipeline.get('test_pipeline', repo_path=self.repo_path)

        self.global_data_product = GlobalDataProduct(
            object_type='pipeline',
            object_uuid=self.pipeline.uuid,
            outdated_after=dict(
                months=1,
                seconds=2,
                weeks=3,
                years=4,
            ),
            outdated_starting_at=dict(
                day_of_month=1,
                day_of_week=2,
                day_of_year=3,
                hour_of_day=4,
                minute_of_hour=5,
                month_of_year=6,
                second_of_minute=7,
                week_of_month=8,
                week_of_year=9,
            ),
            repo_path=self.repo_path,
            settings=dict(
                data_exporter={},
                data_loader=dict(partitions=1),
                transformer=dict(partitions=2),
            ),
            uuid='mage',
        )

        self.file_path = os.path.join(
            self.repo_path,
            'global_data_products.yaml',
        )
        self.global_data_product.save()

        PipelineRun.query.filter(
            PipelineRun.id.in_([pr.id for pr in self.global_data_product.pipeline_runs()]),
        ).delete()

    def tearDown(self):
        super().tearDown()
        os.remove(self.file_path)

    @freeze_time('2023-10-11 12:13:14')
    def test_trigger_and_check_status_failed(self):
        pipeline_schedule = fetch_or_create_pipeline_schedule(self.global_data_product)
        pipeline_run = PipelineRun.create(
            execution_date=datetime.utcnow() + timedelta(seconds=1),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.FAILED,
        )

        count = PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
        ).count()

        error = False
        try:
            trigger_and_check_status(
                self.global_data_product,
                poll_interval=1,
                poll_timeout=2,
                should_schedule=False,
                round_number=1,
            )
        except Exception as err:
            error = True
            message = (
                f'Pipeline run {pipeline_run.id} for '
                f'global data product {self.global_data_product.uuid}: {pipeline_run.status}.'
            )
            self.assertEqual(
                message,
                str(err),
            )
        self.assertTrue(error)

        self.assertEqual(
            PipelineRun.query.filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
            ).count(),
            count,
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_trigger_and_check_status_cancelled(self):
        pipeline_schedule = fetch_or_create_pipeline_schedule(self.global_data_product)
        PipelineRun.create(
            execution_date=datetime.utcnow() + timedelta(seconds=1),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.CANCELLED,
        )

        count = PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
        ).count()

        error = False
        try:
            trigger_and_check_status(
                self.global_data_product,
                poll_interval=1,
                poll_timeout=2,
                should_schedule=False,
            )
        except Exception:
            error = True
        self.assertFalse(error)

        self.assertEqual(
            PipelineRun.query.filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
            ).count(),
            count + 1,
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_trigger_and_check_status_not_outdated(self):
        pipeline_schedule = fetch_or_create_pipeline_schedule(self.global_data_product)
        PipelineRun.create(
            execution_date=datetime.utcnow().replace(tzinfo=timezone.utc) - timedelta(seconds=2),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )
        PipelineRun.create(
            execution_date=datetime.utcnow().replace(tzinfo=timezone.utc) - timedelta(seconds=1),
            pipeline_schedule_id=pipeline_schedule.id,
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )

        count = PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
        ).count()

        self.global_data_product.outdated_after = dict(seconds=2)
        self.global_data_product.outdated_starting_at = {}

        trigger_and_check_status(
            self.global_data_product,
            poll_interval=1,
            poll_timeout=2,
            should_schedule=False,
        )

        self.assertEqual(
            PipelineRun.query.filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
            ).count(),
            count,
        )

        self.global_data_product.outdated_after = dict(seconds=0)
        self.global_data_product.outdated_starting_at = dict(day_of_month=12)

        trigger_and_check_status(
            self.global_data_product,
            poll_interval=1,
            poll_timeout=2,
            should_schedule=False,
        )

        self.assertEqual(
            PipelineRun.query.filter(
                PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
            ).count(),
            count,
        )

    # def test_trigger_and_check_status_when_there_are_more_running(self):
    #     now = datetime.utcnow().replace(tzinfo=timezone.utc)

    #     pipeline_schedule = fetch_or_create_pipeline_schedule(self.global_data_product)
    #     pipeline_run1 = PipelineRun.create(
    #         execution_date=now - timedelta(seconds=11),
    #         pipeline_schedule_id=pipeline_schedule.id,
    #         pipeline_uuid=self.global_data_product.pipeline.uuid,
    #         status=PipelineRun.PipelineRunStatus.RUNNING,
    #     )
    #     pipeline_run2 = PipelineRun.create(
    #         execution_date=now - timedelta(seconds=6),
    #         pipeline_schedule_id=pipeline_schedule.id,
    #         pipeline_uuid=self.global_data_product.pipeline.uuid,
    #         status=PipelineRun.PipelineRunStatus.RUNNING,
    #     )
    #     pipeline_run3 = PipelineRun.create(
    #         execution_date=now - timedelta(seconds=5),
    #         pipeline_schedule_id=pipeline_schedule.id,
    #         pipeline_uuid=self.global_data_product.pipeline.uuid,
    #         status=PipelineRun.PipelineRunStatus.RUNNING,
    #     )
    #     pipeline_run3_id = pipeline_run3.id
    #     pipeline_run4 = PipelineRun.create(
    #         execution_date=now - timedelta(seconds=0),
    #         pipeline_schedule_id=pipeline_schedule.id,
    #         pipeline_uuid=self.global_data_product.pipeline.uuid,
    #         status=PipelineRun.PipelineRunStatus.RUNNING,
    #     )

    #     count = PipelineRun.query.filter(
    #         PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
    #     ).count()

    #     self.global_data_product.outdated_after = dict(seconds=5)
    #     self.global_data_product.outdated_starting_at = {}

    #     try:
    #         trigger_and_check_status(
    #             self.global_data_product,
    #             error_on_failure=False,
    #             poll_interval=1,
    #             poll_timeout=2,
    #             should_schedule=False,
    #         )
    #     except Exception:
    #         pass

    #     self.assertEqual(
    #         PipelineRun.query.filter(
    #             PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
    #         ).count(),
    #         count - 1,
    #     )

    #     self.assertEqual(PipelineRun.query.filter(PipelineRun.id == pipeline_run1.id).count(), 1)
    #     self.assertEqual(PipelineRun.query.filter(PipelineRun.id == pipeline_run2.id).count(), 1)
    #     self.assertEqual(PipelineRun.query.filter(PipelineRun.id == pipeline_run3_id).count(), 0)
    #     self.assertEqual(PipelineRun.query.filter(PipelineRun.id == pipeline_run4.id).count(), 1)

    # def test_trigger_and_check_status_should_create_new_pipeline_run(self):
    #     now = datetime.utcnow().replace(tzinfo=timezone.utc)
    #     pipeline_schedule = fetch_or_create_pipeline_schedule(self.global_data_product)
    #     PipelineRun.create(
    #         execution_date=now - timedelta(seconds=2),
    #         pipeline_schedule_id=pipeline_schedule.id,
    #         pipeline_uuid=self.global_data_product.pipeline.uuid,
    #         status=PipelineRun.PipelineRunStatus.COMPLETED,
    #     )

    #     count = PipelineRun.query.filter(
    #         PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
    #     ).count()

    #     self.global_data_product.outdated_after = dict(seconds=2)
    #     self.global_data_product.outdated_starting_at = {}

    #     try:
    #         trigger_and_check_status(
    #             self.global_data_product,
    #             error_on_failure=False,
    #             poll_interval=1,
    #             poll_timeout=2,
    #             should_schedule=False,
    #         )
    #     except Exception:
    #         pass

    #     self.assertEqual(
    #         PipelineRun.query.filter(
    #             PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
    #         ).count(),
    #         count + 1,
    #     )

    # def test_trigger_and_check_status_with_schedule_all(self):
    #     pipeline_schedule = fetch_or_create_pipeline_schedule(self.global_data_product)

    #     count = PipelineRun.query.filter(
    #         PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
    #     ).count()

    #     self.global_data_product.outdated_after = dict(seconds=2)
    #     self.global_data_product.outdated_starting_at = {}

    #     trigger_and_check_status(
    #         self.global_data_product,
    #         check_status=False,
    #         error_on_failure=False,
    #         poll_interval=1,
    #         poll_timeout=2,
    #         should_schedule=False,
    #     )

    #     with patch.object(PipelineScheduler, 'schedule') as _:
    #         schedule_all()

    #     pipeline_runs = PipelineRun.query.filter(
    #         PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
    #     ).all()

    #     pipeline_runs.sort(key=lambda pr: pr.execution_date)
    #     pipeline_run = pipeline_runs[-1]

    #     self.assertEqual(
    #         pipeline_run.status,
    #         PipelineRun.PipelineRunStatus.RUNNING,
    #     )
    #     self.assertEqual(
    #         PipelineRun.query.filter(
    #             PipelineRun.pipeline_schedule_id == pipeline_schedule.id,
    #         ).count(),
    #         count + 1,
    #     )

    def test_fetch_or_create_pipeline_schedule(self):
        self.assertEqual(PipelineSchedule.query.filter(
            PipelineSchedule.global_data_product_uuid == self.global_data_product.uuid,
        ).count(), 0)

        pipeline_schedule1 = fetch_or_create_pipeline_schedule(self.global_data_product)
        self.assertEqual(pipeline_schedule1.global_data_product_uuid, self.global_data_product.uuid)

        self.assertEqual(PipelineSchedule.query.filter(
            PipelineSchedule.global_data_product_uuid == self.global_data_product.uuid,
        ).count(), 1)

        pipeline_schedule2 = fetch_or_create_pipeline_schedule(self.global_data_product)
        self.assertEqual(pipeline_schedule2.id, pipeline_schedule1.id)

        self.assertEqual(PipelineSchedule.query.filter(
            PipelineSchedule.global_data_product_uuid == self.global_data_product.uuid,
        ).count(), 1)

        PipelineSchedule.create(
            global_data_product_uuid=pipeline_schedule1.global_data_product_uuid,
            name=pipeline_schedule1.name,
            pipeline_uuid=pipeline_schedule1.pipeline_uuid,
            schedule_type=pipeline_schedule1.schedule_type,
        )

        pipeline_schedule4 = fetch_or_create_pipeline_schedule(self.global_data_product)
        self.assertEqual(pipeline_schedule4.id, pipeline_schedule2.id)

        self.assertEqual(PipelineSchedule.query.filter(
            PipelineSchedule.global_data_product_uuid == self.global_data_product.uuid,
        ).count(), 1)
