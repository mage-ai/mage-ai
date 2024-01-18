import uuid

from mage_ai.data_preparation.models.block.dynamic import all_variable_uuids
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
