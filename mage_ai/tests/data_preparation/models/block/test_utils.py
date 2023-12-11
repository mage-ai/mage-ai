from uuid import uuid4

from mage_ai.data_preparation.models.block.utils import (
    dynamic_block_uuid,
    dynamic_block_values_and_metadata,
    is_dynamic_block,
    is_dynamic_block_child,
    should_reduce_output,
)
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


class BlockUtilsTest(BaseApiTestCase):
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

    def tearDown(self):
        self.pipeline1.delete()
        super().tearDown()

    def test_dynamic_block_uuid(self):
        block_uuid = uuid4().hex
        block_uuid_metadata = uuid4().hex
        upstream_block_uuid = f'{uuid4().hex}:3:4'

        self.assertEqual(dynamic_block_uuid(block_uuid), f'{block_uuid}:None')
        self.assertEqual(dynamic_block_uuid(block_uuid, index=0), f'{block_uuid}:0')
        self.assertEqual(dynamic_block_uuid(
            block_uuid,
            index=0,
            metadata=dict(block_uuid=block_uuid_metadata),
        ), f'{block_uuid}:{block_uuid_metadata}')

        self.assertEqual(dynamic_block_uuid(
            block_uuid,
            index=0,
            upstream_block_uuid=upstream_block_uuid,
            upstream_block_uuids=[
                '0',
                '1',
                '2',
            ],
        ), f'{block_uuid}:0__1__2:0')

        self.assertEqual(dynamic_block_uuid(
            block_uuid,
            index=0,
            metadata=dict(block_uuid=block_uuid_metadata),
            upstream_block_uuid=upstream_block_uuid,
            upstream_block_uuids=[
                '0',
                '1',
                '2',
            ],
        ), f'{block_uuid}:0__1__2:{block_uuid_metadata}')

        self.assertEqual(dynamic_block_uuid(
            block_uuid,
            index=0,
            upstream_block_uuid=upstream_block_uuid,
        ), f'{block_uuid}:0:3:4')

        self.assertEqual(dynamic_block_uuid(
            block_uuid,
            index=0,
            metadata=dict(block_uuid=block_uuid_metadata),
            upstream_block_uuid=upstream_block_uuid,
        ), f'{block_uuid}:{block_uuid_metadata}:3:4')

    def test_dynamic_block_values_and_metadata(self):
        execution_partition = uuid4().hex

        self.block.save_outputs(
            [
                dict(
                    variable_uuid='output_0',
                    text_data=[i for i in range(3)],
                ),
                dict(
                    variable_uuid='output_1',
                    text_data=[dict(mage=i) for i in range(3)],
                ),
            ],
            execution_partition=execution_partition,
            override=True,
            override_output_variable=True,
        )

        self.assertEqual(
            dynamic_block_values_and_metadata(self.block, execution_partition=execution_partition),
            (
                [0, 1, 2],
                [dict(mage=0), dict(mage=1), dict(mage=2)],
            ),
        )

        self.assertEqual(
            dynamic_block_values_and_metadata(
                self.block2,
                block_uuid=self.block.uuid,
                execution_partition=execution_partition,
            ),
            (
                [0, 1, 2],
                [dict(mage=0), dict(mage=1), dict(mage=2)],
            ),
        )

        self.block3.save_outputs(
            [
                dict(
                    variable_uuid='output_0',
                    text_data=[i for i in range(3)],
                ),
                dict(
                    variable_uuid='output_1',
                    text_data=[dict(mage=i) for i in range(3)],
                ),
            ],
            override=True,
            override_output_variable=True,
        )

        self.assertEqual(
            dynamic_block_values_and_metadata(self.block3),
            (
                [0, 1, 2],
                [dict(mage=0), dict(mage=1), dict(mage=2)],
            ),
        )

    def test_is_dynamic_block(self):
        self.assertFalse(is_dynamic_block(self.block))
        self.block.configuration = dict(dynamic=True)
        self.assertTrue(is_dynamic_block(self.block))

    def test_is_dynamic_block_child1(self):
        self.assertFalse(is_dynamic_block_child(self.block))
        self.assertFalse(is_dynamic_block_child(self.block2))
        self.block2.configuration = dict(dynamic=True)
        self.assertFalse(is_dynamic_block_child(self.block2))
        self.block.configuration = dict(dynamic=True)
        self.assertTrue(is_dynamic_block_child(self.block2))

    def test_is_dynamic_block_child2(self):
        self.pipeline1.add_block(self.block2, upstream_block_uuids=[self.block.uuid])
        self.pipeline1.add_block(self.block3, upstream_block_uuids=[self.block2.uuid])
        self.pipeline1.add_block(self.block4, upstream_block_uuids=[self.block3.uuid])

        self.assertFalse(is_dynamic_block_child(self.block))
        self.assertFalse(is_dynamic_block_child(self.block2))
        self.assertFalse(is_dynamic_block_child(self.block3))
        self.assertFalse(is_dynamic_block_child(self.block4))

        self.block4.configuration = dict(dynamic=True)
        self.assertFalse(is_dynamic_block_child(self.block4))
        self.block3.configuration = dict(dynamic=True)
        self.assertTrue(is_dynamic_block_child(self.block4))

        self.block3.configuration = dict(dynamic=False)
        self.assertFalse(is_dynamic_block_child(self.block4))
        self.block2.configuration = dict(dynamic=True)
        self.assertTrue(is_dynamic_block_child(self.block4))

        self.block2.configuration = dict(dynamic=False)
        self.assertFalse(is_dynamic_block_child(self.block4))
        self.block.configuration = dict(dynamic=True)
        self.assertTrue(is_dynamic_block_child(self.block4))

    def test_is_dynamic_block_child_with_reduce_output_blocks(self):
        self.pipeline1.add_block(self.block, upstream_block_uuids=None)
        self.pipeline1.add_block(self.block4, upstream_block_uuids=[self.block.uuid])
        self.block.configuration = dict(dynamic=True)
        self.assertTrue(is_dynamic_block_child(self.block4))
        self.block.configuration = dict(dynamic=True, reduce_output=True)
        self.assertFalse(is_dynamic_block_child(self.block4))

        self.pipeline1.add_block(self.block4, upstream_block_uuids=[
            self.block.uuid,
            self.block2.uuid,
        ])
        self.assertFalse(is_dynamic_block_child(self.block4))
        self.block2.configuration = dict(dynamic=True)
        self.assertTrue(is_dynamic_block_child(self.block4))
        self.block2.configuration = dict(reduce_output=True)
        self.assertFalse(is_dynamic_block_child(self.block4))

        self.pipeline1.add_block(self.block3, upstream_block_uuids=None)
        self.pipeline1.add_block(self.block4, upstream_block_uuids=[
            self.block.uuid,
            self.block2.uuid,
            self.block3.uuid,
        ])
        self.assertFalse(is_dynamic_block_child(self.block4))
        self.block3.configuration = dict(dynamic=True)
        self.assertTrue(is_dynamic_block_child(self.block4))

    def test_should_reduce_output(self):
        self.assertFalse(should_reduce_output(self.block))
        self.block.configuration = dict(reduce_output=True)
        self.assertTrue(should_reduce_output(self.block))
