import os

from datetime import datetime, timedelta
from freezegun import freeze_time
from unittest.mock import MagicMock, patch

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.global_data_product import GlobalDataProduct
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.schedules import PipelineRun, PipelineSchedule
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.orchestration.triggers.global_data_product import fetch_or_create_pipeline_schedule
from mage_ai.settings.repo import get_repo_path
from mage_ai.tests.base_test import DBTestCase


class GlobalDataProductTest(DBTestCase):
    def setUp(self):
        super().setUp()

        self.pipeline = Pipeline.create(
            'test pipeline',
            repo_path=self.repo_path,
        )
        self.pipeline.add_block(Block('data_loader', 'data_loader', BlockType.DATA_LOADER))
        self.pipeline.add_block(Block('transformer', 'transformer', BlockType.TRANSFORMER))
        self.pipeline.add_block(Block('data_exporter', 'data_exporter', BlockType.DATA_EXPORTER))

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
