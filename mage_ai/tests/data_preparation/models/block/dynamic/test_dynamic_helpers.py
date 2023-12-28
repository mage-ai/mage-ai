import uuid

from mage_ai.data_preparation.models.block.dynamic import (
    all_variable_uuids,
    reduce_output_from_block,
)
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks


class DynamicHelpersTest(BaseApiTestCase):
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

    def test_all_variable_uuids(self):
        partition = 'mage'

        for i in range(3):
            self.block.save_outputs(
                [
                    dict(
                        variable_uuid=f'output_{i}',
                        text_data=uuid.uuid4().hex,
                    ),
                ],
                execution_partition=partition,
                override=True,
                override_output_variable=True,
            )

        self.assertEqual(
            sorted(all_variable_uuids(self.block, partition=partition)),
            [
                'output_0',
                'output_1',
                'output_2',
            ],
        )

    def test_all_variable_uuids_with_colons(self):
        partition = 'mage'

        for block_uuid in range(3):
            for i in range(3):
                variable_mapping = {
                    f'output_{block_uuid}_{i}_0': uuid.uuid4().hex,
                    f'output_{block_uuid}_{i}_1': uuid.uuid4().hex,
                }

                parts = [
                    self.block.uuid,
                ]
                if block_uuid >= 1:
                    parts.append(f'custom_uuid_{block_uuid}')
                parts.append(str(i))
                dynamic_block_uuid = ':'.join(parts)

                self.block.store_variables(
                    variable_mapping,
                    dynamic_block_uuid=dynamic_block_uuid,
                    execution_partition=partition,
                    override=True,
                    override_outputs=True,
                )

        self.assertEqual(
            sorted(all_variable_uuids(self.block, partition=partition)),
            [
                'output_0_0_0',
                'output_0_0_1',
                'output_0_1_0',
                'output_0_1_1',
                'output_0_2_0',
                'output_0_2_1',
                'output_1_0_0',
                'output_1_0_1',
                'output_1_1_0',
                'output_1_1_1',
                'output_1_2_0',
                'output_1_2_1',
                'output_2_0_0',
                'output_2_0_1',
                'output_2_1_0',
                'output_2_1_1',
                'output_2_2_0',
                'output_2_2_1',
            ],
        )

    def test_reduce_output_from_block(self):
        self.block.configuration = dict(dynamic=True)
        self.pipeline1.add_block(self.block)

        partition = 'mage'
        value_base = uuid.uuid4().hex

        for block_uuid in range(3):
            for i in range(3):
                variable_mapping = {
                    'output_0': f'{value_base}_{block_uuid}_{i}',
                    'output_1': uuid.uuid4().hex,
                }

                parts = [
                    self.block2.uuid,
                    str(block_uuid),
                    str(i),
                ]
                dynamic_block_uuid = ':'.join(parts)

                self.block2.store_variables(
                    variable_mapping,
                    dynamic_block_uuid=dynamic_block_uuid,
                    execution_partition=partition,
                    override=True,
                    override_outputs=True,
                )

        values = reduce_output_from_block(
            self.block2,
            'output_0',
            partition=partition,
        )

        self.assertEqual(sorted(values), [
            f'{value_base}_0_0',
            f'{value_base}_0_1',
            f'{value_base}_0_2',
            f'{value_base}_1_0',
            f'{value_base}_1_1',
            f'{value_base}_1_2',
            f'{value_base}_2_0',
            f'{value_base}_2_1',
            f'{value_base}_2_2',
        ])
