import os
from unittest.mock import ANY, call, patch

from mage_ai.data_preparation.models.block.global_data_product import (
    GlobalDataProductBlock,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.data_preparation.models.global_data_product import GlobalDataProduct
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.tests.base_test import DBTestCase


class GlobalDataProductBlockTest(DBTestCase):
    def setUp(self):
        super().setUp()

        try:
            self.pipeline = Pipeline.create(
                'test pipeline',
                repo_path=self.repo_path,
            )
        except Exception:
            self.pipeline = Pipeline.get('test_pipeline', repo_path=self.repo_path)

        self.block = GlobalDataProductBlock(
            'GDP',
            'GDP',
            BlockType.GLOBAL_DATA_PRODUCT,
            configuration=dict(
                global_data_product=dict(
                    outdated_after=dict(months=12),
                    outdated_starting_at=dict(day_of_month=12),
                    settings=dict(data_loader=dict(partitions=12)),
                    uuid='mage',
                ),
            ),
            pipeline=self.pipeline,
        )

        self.global_data_product = GlobalDataProduct(
            object_type='pipeline',
            object_uuid=self.pipeline.uuid,
            outdated_after=dict(months=1),
            outdated_starting_at=dict(day_of_month=1),
            repo_path=self.repo_path,
            settings=dict(data_loader=dict(partitions=1)),
            uuid='mage',
        )

        self.file_path = os.path.join(
            self.repo_path,
            'global_data_products.yaml',
        )
        self.global_data_product.save()

    def tearDown(self):
        super().tearDown()
        os.remove(self.file_path)

    def test_get_global_data_product(self):
        gdp = self.block.get_global_data_product()
        self.assertEqual(gdp.outdated_after, dict(months=12))
        self.assertEqual(gdp.outdated_starting_at, dict(day_of_month=12))
        self.assertEqual(gdp.settings, dict(data_loader=dict(partitions=12)))

    @patch('mage_ai.orchestration.triggers.global_data_product.trigger_and_check_status')
    def test_execute_block(self, mock_trigger_and_check_status):
        self.block.execute_block(global_vars=dict(variables=dict(mage=3)))
        mock_trigger_and_check_status.assert_has_calls([
            call(
                self.block.get_global_data_product(),
                block=self.block,
                from_notebook=False,
                logger=ANY,
                logging_tags=ANY,
                poll_interval=30,
                remote_blocks=None,
                variables=dict(mage=3),
            ),
        ])
