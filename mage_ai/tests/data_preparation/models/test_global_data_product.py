import os
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from dateutil.relativedelta import relativedelta
from freezegun import freeze_time

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.global_data_product import GlobalDataProduct
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.orchestration.triggers.global_data_product import (
    fetch_or_create_pipeline_schedule,
)
from mage_ai.settings.repo import get_repo_path
from mage_ai.tests.base_test import DBTestCase


class GlobalDataProductTest(DBTestCase):
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
            self.pipeline = Pipeline.get('test_pipeline')

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
            settings=dict(
                data_exporter={},
                data_loader=dict(partitions=1),
                transformer=dict(partitions=2),
            ),
            uuid='mage',
        )
        self.pipeline_schedule = fetch_or_create_pipeline_schedule(self.global_data_product)

        self.file_path = os.path.join(
            self.repo_path,
            'global_data_products.yaml',
        )
        self.global_data_product.save(file_path=self.file_path)

    def tearDown(self):
        super().tearDown()
        os.remove(self.file_path)

    def test_file_path(self):
        self.assertTrue(
            self.global_data_product.file_path,
            os.path.join(get_repo_path(), 'global_data_products.yaml'),
        )

    def test_load_all(self):
        arr = GlobalDataProduct.load_all(file_path=self.file_path)
        self.assertEqual(len(arr), 1)

        gdp = arr[0]
        for key in [
            'object_type',
            'object_uuid',
            'outdated_after',
            'outdated_starting_at',
            'settings',
            'uuid',
        ]:
            self.assertEqual(getattr(gdp, key), getattr(self.global_data_product, key))

    def test_get(self):
        gdp = GlobalDataProduct.get('mage', file_path=self.file_path)

        for key in [
            'object_type',
            'object_uuid',
            'outdated_after',
            'outdated_starting_at',
            'settings',
            'uuid',
        ]:
            self.assertEqual(getattr(gdp, key), getattr(self.global_data_product, key))

    def test_pipeline(self):
        self.assertEqual(self.global_data_product.pipeline.uuid, self.pipeline.uuid)

    @freeze_time('2023-10-11 12:13:14')
    def test_get_outputs(self):
        pipeline_run1 = PipelineRun.create(
            execution_date=datetime.now(),
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )
        pipeline_run2 = PipelineRun.create(
            execution_date=datetime.now() + timedelta(seconds=1),
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )

        def output_variable_objects(self, execution_partition: str):
            if pipeline_run1.execution_partition == execution_partition:
                return [
                    Variable(
                        'variable_uuid1',
                        'test',
                        self.uuid,
                        partition=execution_partition,
                    ),
                ]
            elif pipeline_run2.execution_partition == execution_partition:
                return [
                    Variable(
                        'variable_uuid2',
                        'test',
                        self.uuid,
                        partition=execution_partition,
                    ),
                ]

            return None

        def get_variable(pipeline_uuid, block_uuid, variable_uuid):
            if block_uuid == 'data_loader':
                if 'variable_uuid1' == variable_uuid:
                    return 0
                elif 'variable_uuid2' == variable_uuid:
                    return 1
            elif block_uuid == 'transformer':
                if 'variable_uuid1' == variable_uuid:
                    return 1
                elif 'variable_uuid2' == variable_uuid:
                    return 2
            elif block_uuid == 'data_exporter':
                if 'variable_uuid1' == variable_uuid:
                    return 2
                elif 'variable_uuid2' == variable_uuid:
                    return 3

        with patch.object(
            Block,
            'output_variable_objects',
            output_variable_objects,
        ):
            with patch.object(
                self.global_data_product.pipeline.variable_manager,
                'get_variable',
                get_variable,
            ):
                self.assertEqual(
                    self.global_data_product.get_outputs(),
                    dict(
                        data_loader=[1],
                        transformer=[2, 1],
                        data_exporter=[3],
                    ),
                )

    def test_get_outdated_at_delta(self):
        self.assertEqual(
            self.global_data_product.get_outdated_at_delta(),
            relativedelta(
                months=1,
                seconds=2,
                weeks=3,
                years=4,
            ),
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_get_outdated_at_delta_in_seconds(self):
        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        d = relativedelta(
            months=1,
            seconds=2,
            weeks=3,
            years=4,
        )

        self.assertEqual(
            self.global_data_product.get_outdated_at_delta(in_seconds=True),
            ((now + d) - now).total_seconds(),
        )

    def test_is_outdated_after(self):
        with freeze_time('2023-10-02 00:00:00'):
            self.global_data_product.outdated_starting_at = dict(
                day_of_month=2,
            )
            self.assertTrue(self.global_data_product.is_outdated_after())

            self.global_data_product.outdated_starting_at = dict(
                day_of_month=3,
            )
            self.assertFalse(self.global_data_product.is_outdated_after())

        with freeze_time('2023-10-03 00:00:00'):
            self.global_data_product.outdated_starting_at = dict(
                day_of_week=2,
            )
            self.assertTrue(self.global_data_product.is_outdated_after())

            self.global_data_product.outdated_starting_at = dict(
                day_of_week=3,
            )
            self.assertFalse(self.global_data_product.is_outdated_after())

        with freeze_time('2023-01-02 00:00:00'):
            self.global_data_product.outdated_starting_at = dict(
                day_of_year=2,
            )
            self.assertTrue(self.global_data_product.is_outdated_after())

            self.global_data_product.outdated_starting_at = dict(
                day_of_year=3,
            )
            self.assertFalse(self.global_data_product.is_outdated_after())

        with freeze_time('2023-10-02 04:00:00'):
            self.global_data_product.outdated_starting_at = dict(
                hour_of_day=4,
            )
            self.assertTrue(self.global_data_product.is_outdated_after())

            self.global_data_product.outdated_starting_at = dict(
                hour_of_day=5,
            )
            self.assertFalse(self.global_data_product.is_outdated_after())

        with freeze_time('2023-10-02 04:05:00'):
            self.global_data_product.outdated_starting_at = dict(
                minute_of_hour=5,
            )
            self.assertTrue(self.global_data_product.is_outdated_after())

            self.global_data_product.outdated_starting_at = dict(
                minute_of_hour=6,
            )
            self.assertFalse(self.global_data_product.is_outdated_after())

        with freeze_time('2023-06-02 04:05:00'):
            self.global_data_product.outdated_starting_at = dict(
                month_of_year=6,
            )
            self.assertTrue(self.global_data_product.is_outdated_after())

            self.global_data_product.outdated_starting_at = dict(
                month_of_year=7,
            )
            self.assertFalse(self.global_data_product.is_outdated_after())

        with freeze_time('2023-06-02 04:05:07'):
            self.global_data_product.outdated_starting_at = dict(
                second_of_minute=7,
            )
            self.assertTrue(self.global_data_product.is_outdated_after())

            self.global_data_product.outdated_starting_at = dict(
                second_of_minute=8,
            )
            self.assertFalse(self.global_data_product.is_outdated_after())

        with freeze_time('2023-10-02 04:05:07'):
            self.global_data_product.outdated_starting_at = dict(
                week_of_month=1,
            )
            self.assertTrue(self.global_data_product.is_outdated_after())

            self.global_data_product.outdated_starting_at = dict(
                week_of_month=2,
            )
            self.assertFalse(self.global_data_product.is_outdated_after())

        with freeze_time('2023-01-02 04:05:07'):
            self.global_data_product.outdated_starting_at = dict(
                week_of_year=1,
            )
            self.assertTrue(self.global_data_product.is_outdated_after())

            self.global_data_product.outdated_starting_at = dict(
                week_of_year=2,
            )
            self.assertFalse(self.global_data_product.is_outdated_after())

        with freeze_time('2023-06-02 04:05:07'):
            self.global_data_product.outdated_starting_at = dict(
                hour_of_day=4,
                minute_of_hour=5,
                second_of_minute=7,
            )
            self.assertTrue(self.global_data_product.is_outdated_after())

    def test_next_run_at(self):
        pipeline_run1 = PipelineRun.create(
            execution_date=datetime.now(),
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )
        d = relativedelta(
            months=1,
            seconds=2,
            weeks=3,
            years=4,
        )
        self.assertEqual(
            self.global_data_product.next_run_at(pipeline_run1),
            (pipeline_run1.execution_date + d).replace(tzinfo=timezone.utc),
        )

    @freeze_time('2023-10-11 12:13:14')
    def test_is_outdated(self):
        self.assertEqual(
            self.global_data_product.is_outdated(),
            [True, True],
        )

        pipeline_run1 = PipelineRun.create(
            execution_date=datetime(2023, 10, 11, 2, 13, 13).replace(tzinfo=timezone.utc),
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )
        pipeline_run1.execution_date = pipeline_run1.execution_date.replace(tzinfo=timezone.utc)

        self.global_data_product.outdated_after = dict(seconds=60 * 60 * 10)
        self.assertEqual(
            self.global_data_product.is_outdated(pipeline_run1),
            [True, False],
        )

        self.global_data_product.outdated_starting_at = dict(day_of_month=10)
        self.assertEqual(
            self.global_data_product.is_outdated(pipeline_run1),
            [True, True],
        )

    def test_pipeline_runs(self):
        PipelineRun.query.filter(
            PipelineRun.pipeline_schedule_id == self.pipeline_schedule.id,
            PipelineRun.pipeline_uuid == self.global_data_product.pipeline.uuid,
        ).delete()

        pipeline_run1 = PipelineRun.create(
            execution_date=datetime.now(),
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )
        pipeline_run2 = PipelineRun.create(
            execution_date=datetime.now() + timedelta(seconds=1),
            pipeline_schedule_id=self.pipeline_schedule.id,
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.FAILED,
        )
        PipelineRun.create(
            execution_date=datetime.now() + timedelta(seconds=1),
            pipeline_uuid=self.global_data_product.pipeline.uuid,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )
        PipelineRun.create(
            execution_date=datetime.now() + timedelta(seconds=1),
            pipeline_schedule_id=self.pipeline_schedule.id,
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )

        arr1 = self.global_data_product.pipeline_runs()
        arr2 = self.global_data_product.pipeline_runs(limit=1)
        arr3 = self.global_data_product.pipeline_runs(
            status=PipelineRun.PipelineRunStatus.COMPLETED,
        )

        self.assertEqual([pr.id for pr in arr1], [pipeline_run2.id, pipeline_run1.id])
        self.assertEqual([pr.id for pr in arr2], [pipeline_run2.id])
        self.assertEqual([pr.id for pr in arr3], [pipeline_run1.id])

    def test_to_dict(self):
        d = dict(
            object_type=self.global_data_product.object_type,
            object_uuid=self.global_data_product.object_uuid,
            outdated_after=self.global_data_product.outdated_after,
            outdated_starting_at=self.global_data_product.outdated_starting_at,
            settings=self.global_data_product.settings,
        )

        self.assertEqual(
            self.global_data_product.to_dict(),
            d,
        )

        d.update(uuid=self.global_data_product.uuid)
        self.assertEqual(
            self.global_data_product.to_dict(include_uuid=True),
            d,
        )

    def test_delete(self):
        arr = GlobalDataProduct.load_all(file_path=self.file_path)
        self.assertEqual(len(arr), 1)
        self.global_data_product.delete()
        arr = GlobalDataProduct.load_all(file_path=self.file_path)
        self.assertEqual(len(arr), 0)

    def test_save(self):
        arr = GlobalDataProduct.load_all(file_path=self.file_path)
        self.assertEqual(len(arr), 1)

        self.global_data_product.delete()
        arr = GlobalDataProduct.load_all(file_path=self.file_path)
        self.assertEqual(len(arr), 0)

        self.global_data_product.save()
        arr = GlobalDataProduct.load_all(file_path=self.file_path)
        self.assertEqual(len(arr), 1)

    def test_update(self):
        self.global_data_product.update(dict(
            object_type='test1',
            object_uuid='test2',
            outdated_after=dict(seconds=777),
            outdated_starting_at=dict(day_of_month=40),
            settings=dict(mage=dict(partitions=3)),
        ))

        arr = GlobalDataProduct.load_all(file_path=self.file_path)
        gdp = arr[0]

        self.assertEqual(gdp.object_type, 'test1')
        self.assertEqual(gdp.object_uuid, 'test2')
        self.assertEqual(gdp.outdated_after, dict(seconds=777))
        self.assertEqual(gdp.outdated_starting_at, dict(day_of_month=40))
        self.assertEqual(gdp.settings, dict(mage=dict(partitions=3)))
