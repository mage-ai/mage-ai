from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dynamic.utils import (
    all_upstreams_completed,
    dynamically_created_child_block_runs,
)
from mage_ai.orchestration.db.models.schedules import BlockRun
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


class DynamicUtilsTest(BaseApiTestCase):
    def setUp(self):
        super().setUp()

        arr = create_pipeline_with_blocks(
            self.faker.unique.name(),
            self.repo_path,
            return_blocks=True,
        )
        self.pipeline1 = arr[0]
        self.blocks = arr[1]
        self.block, self.block2, self.block3, self.block4 = self.blocks

        self.block5 = Block.create('block5', 'transformer', self.repo_path, language='python')
        self.block6 = Block.create('block6', 'transformer', self.repo_path, language='python')
        self.pipeline1.add_block(self.block5)
        self.pipeline1.add_block(self.block6)

        self.block_runs = []
        for idx1, block in enumerate(self.blocks):
            for idx2 in range(idx1 + 1):
                metrics = None

                block_uuid = block.uuid
                if idx2 >= 1:
                    block_uuid = f'{block_uuid}:{idx2 - 1}'

                    if idx1 >= 2:
                        dynamic_upstream_block_uuids = []
                        for i1 in range(1, idx1):
                            for i2 in range(i1):
                                b_uuid = self.blocks[i1].uuid
                                dynamic_upstream_block_uuids.append(f'{b_uuid}:{i2}')

                        metrics = dict(dynamic_upstream_block_uuids=dynamic_upstream_block_uuids)

                block_run = BlockRun.create(
                    block_uuid=block_uuid,
                    metrics=metrics,
                    pipeline_run_id=0,
                )
                self.block_runs.append(block_run)

        self.block_runs.append(BlockRun.create(
            block_uuid=self.block5.uuid,
            pipeline_run_id=0,
        ))

    def tearDown(self):
        BlockRun.query.delete()
        self.pipeline1.delete()
        super().tearDown()

    def test_dynamically_created_child_block_runs(self):
        self.assertEqual(dynamically_created_child_block_runs(
            self.pipeline1,
            self.block,
            self.block_runs,
        ), [])

        self.assertEqual([br.block_uuid for br in dynamically_created_child_block_runs(
            self.pipeline1,
            self.block2,
            self.block_runs,
        )], [
            'block2:0',
        ])

        self.assertEqual([br.block_uuid for br in dynamically_created_child_block_runs(
            self.pipeline1,
            self.block3,
            self.block_runs,
        )], [
            'block3:0',
            'block3:1',
        ])

        self.assertEqual([br.block_uuid for br in dynamically_created_child_block_runs(
            self.pipeline1,
            self.block4,
            self.block_runs,
        )], [
            'block4:0',
            'block4:1',
            'block4:2',
        ])

    def test_all_upstreams_completed1(self):
        self.pipeline1.add_block(self.block, upstream_block_uuids=None)
        self.pipeline1.add_block(self.block2, upstream_block_uuids=[self.block.uuid])
        self.assertFalse(all_upstreams_completed(self.block2, self.block_runs))
        self.__complete_block_runs_for_block(self.block)
        self.assertTrue(all_upstreams_completed(self.block2, self.block_runs))

    def test_all_upstreams_completed2(self):
        self.pipeline1.add_block(self.block, upstream_block_uuids=None)
        self.pipeline1.add_block(self.block2, upstream_block_uuids=[self.block.uuid])
        self.pipeline1.add_block(self.block3, upstream_block_uuids=[
            self.block2.uuid,
        ])
        self.assertFalse(all_upstreams_completed(self.block3, self.block_runs))
        self.__complete_block_runs_for_block(self.block)
        self.assertFalse(all_upstreams_completed(self.block3, self.block_runs))
        self.__complete_block_runs_for_block(self.block2)
        self.assertTrue(all_upstreams_completed(self.block3, self.block_runs))

    def test_all_upstreams_completed3(self):
        self.pipeline1.add_block(self.block, upstream_block_uuids=None)
        self.pipeline1.add_block(self.block5, upstream_block_uuids=[self.block.uuid])
        self.pipeline1.add_block(self.block2, upstream_block_uuids=None)
        self.pipeline1.add_block(self.block3, upstream_block_uuids=[
            self.block2.uuid,
        ])
        self.pipeline1.add_block(self.block4, upstream_block_uuids=[
            self.block2.uuid,
            self.block3.uuid,
            self.block5.uuid,
        ])

        self.assertFalse(all_upstreams_completed(self.block4, self.block_runs))
        self.__complete_block_runs_for_block(self.block3)
        self.assertFalse(all_upstreams_completed(self.block4, self.block_runs))
        self.__complete_block_runs_for_block(self.block2)
        self.assertFalse(all_upstreams_completed(self.block4, self.block_runs))
        self.__complete_block_runs_for_block(self.block5)
        self.assertFalse(all_upstreams_completed(self.block4, self.block_runs))
        self.__complete_block_runs_for_block(self.block)
        self.assertTrue(all_upstreams_completed(self.block4, self.block_runs))

        self.pipeline1.add_block(self.block, upstream_block_uuids=[self.block6.uuid])
        self.assertFalse(all_upstreams_completed(self.block4, self.block_runs))

        self.block_runs.append(BlockRun.create(
            block_uuid=self.block6.uuid,
            pipeline_run_id=0,
        ))
        self.assertFalse(all_upstreams_completed(self.block4, self.block_runs))

        self.__complete_block_runs_for_block(self.block6)
        self.assertTrue(all_upstreams_completed(self.block4, self.block_runs))

    def __complete_block_runs_for_block(self, block: Block):
        block_runs = list(filter(
            lambda br, block=block: br.block_uuid == block.uuid,
            self.block_runs,
        )) + dynamically_created_child_block_runs(
            self.pipeline1,
            block,
            self.block_runs,
        )
        for block_run in block_runs:
            block_run.update(status=BlockRun.BlockRunStatus.COMPLETED)
