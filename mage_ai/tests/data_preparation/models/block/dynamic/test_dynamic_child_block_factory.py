from datetime import datetime
from typing import Dict, List

from mage_ai.data_preparation.models.block.dynamic.dynamic_child import (
    DynamicChildBlockFactory,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


class DynamicChildBlockFactoryTest(BaseApiTestCase):
    def setUp(self):
        super().setUp()

        arr = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
            return_blocks=True,
        )
        self.pipeline1 = arr[0]
        self.blocks = arr[1]
        self.block = self.blocks[0]

        self.pipeline_run = PipelineRun.create(
            execution_date=datetime.utcnow(),
            pipeline_schedule_id=0,
            pipeline_uuid=self.pipeline1.uuid,
        )

    def tearDown(self):
        BlockRun.query.delete()
        PipelineRun.query.delete()
        self.pipeline1.delete()
        super().tearDown()

    def test_init(self):
        block_factory = DynamicChildBlockFactory(self.block, self.pipeline_run)
        self.assertEqual(block_factory.block, self.block)
        self.assertEqual(block_factory.pipeline_run, self.pipeline_run)
        self.assertEqual(block_factory.type, BlockType.DYNAMIC_CHILD)

    def test_missing(self):
        block_factory = DynamicChildBlockFactory(self.block, self.pipeline_run)

        for key in [
            'configuration',
            'downstream_blocks',
            'name',
            'pipeline',
            'upstream_blocks',
            'uuid',
        ]:
            self.assertEqual(getattr(self.block, key), getattr(block_factory, key))

    def __set_configuration(
        self,
        block,
        configuration: Dict,
        upstream_block_uuids: List[str] = None,
    ):
        block.configuration = block.configuration or {}
        block.configuration.update(**configuration)

        opts = {}

        if upstream_block_uuids:
            opts['upstream_block_uuids'] = upstream_block_uuids

        self.pipeline1.add_block(block, **opts)

    def __set_dynamic(self, block, **kwargs):
        self.__set_configuration(block, dict(dynamic=True), **kwargs)

    def __set_reduce_output(self, block, **kwargs):
        self.__set_configuration(block, dict(reduce_output=True), **kwargs)
