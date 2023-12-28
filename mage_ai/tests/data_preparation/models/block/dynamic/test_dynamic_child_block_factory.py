import json
import os
from datetime import datetime
from typing import Callable, Dict, List

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dynamic.dynamic_child import (
    DynamicChildBlockFactory,
)
from mage_ai.data_preparation.models.constants import BlockType
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.shared.hash import merge_dict
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline_with_blocks

CURRENT_FILE_PATH = os.path.dirname(os.path.realpath(__file__))


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
        self.block, self.block2, self.block3, self.block4 = self.blocks

        self.block5 = Block.create('block5', 'transformer', self.repo_path, language='python')
        self.block6 = Block.create('block6', 'data_exporter', self.repo_path, language='python')
        self.block7 = Block.create('block7', 'data_exporter', self.repo_path, language='python')
        self.pipeline1.add_block(self.block5, upstream_block_uuids=[b.uuid for b in self.blocks])
        self.pipeline1.add_block(self.block6, upstream_block_uuids=[b.uuid for b in self.blocks] + [
            self.block5.uuid,
        ])
        self.pipeline1.add_block(self.block7)

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

    def test_execute_sync_with_no_upstream_dynamic_block(self):
        block_factory = DynamicChildBlockFactory(self.blocks[3], self.pipeline_run)
        self.assertIsNone(
            block_factory.execute_sync(execution_partition=self.pipeline_run.execution_partition),
        )

    def test_execute_sync_with_1_upstream_dynamic_block(self):
        dynamic_child_block = self.blocks[1]
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        results = self.__setup_upstream_dynamic_block(self.block, dynamic_child_block)
        self.__assert_block_run_results(block_factory, results, 3)

        results = self.__setup_upstream_dynamic_block(
            self.block,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: dict(block_uuid=f'custom_uuid_{index}'),
        )
        self.__assert_block_run_results(block_factory, results, 3)

    def test_execute_sync_with_multiple_upstream_dynamic_blocks(self):
        dynamic_child_block = self.block6
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        self.__setup_upstream_dynamic_block(
            self.block2,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                {},
                {},
            ),
        )
        self.__setup_upstream_dynamic_block(
            self.block3,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )
        self.__setup_upstream_dynamic_block(
            self.block4,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                dict(upstream_blocks=[f'custom_uuid_{index - 1}']) if index >= 1 else {},
            ),
        )
        self.__setup_upstream_dynamic_block(
            self.block5,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                {},
                dict(upstream_blocks=[self.block.uuid]),
            ),
        )

        with open(os.path.join(
            CURRENT_FILE_PATH,
            'dynamic_blocks_upstream_multiple.json',
        )) as f:
            self.__assert_block_run_results(block_factory, json.loads(f.read()), 81)

    def test_execute_sync_with_1_upstream_dynamic_child_block_level1(self):
        dynamic_child_block = self.block3
        self.pipeline1.add_block(dynamic_child_block, upstream_block_uuids=[self.block2.uuid])
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        self.__setup_upstream_dynamic_block(
            self.block,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                {},
                {},
            ),
        )

        with open(os.path.join(CURRENT_FILE_PATH, 'dynamic_child_block.json')) as f:
            self.__assert_block_run_results(block_factory, json.loads(f.read()), 3)

    def test_execute_sync_with_multiple_upstream_dynamic_child_block_level1(self):
        dynamic_child_block = self.block4
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        self.__setup_upstream_dynamic_block(
            self.block,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                {},
                {},
            ),
        )

        with open(os.path.join(CURRENT_FILE_PATH, 'dynamic_child_block_multiple.json')) as f:
            self.__assert_block_run_results(block_factory, json.loads(f.read()), 9)

    def test_execute_sync_with_multiple_upstream_dynamic_child_block_level2(self):
        dynamic_child_block = self.block5
        self.pipeline1.add_block(dynamic_child_block, upstream_block_uuids=[
            self.block4.uuid,
        ])
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        self.__setup_upstream_dynamic_block(
            self.block,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                {},
                {},
            ),
        )

        with open(os.path.join(CURRENT_FILE_PATH, 'dynamic_child_block_multiple_level2.json')) as f:
            self.__assert_block_run_results(block_factory, json.loads(f.read()), 9)

    def test_execute_sync_with_multiple_upstream_dynamic_child_block_multiple_levels(self):
        dynamic_child_block = self.block5
        self.pipeline1.add_block(dynamic_child_block, upstream_block_uuids=[
            self.block3.uuid,
            self.block4.uuid,
        ])
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        self.__setup_upstream_dynamic_block(
            self.block,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )

        with open(os.path.join(CURRENT_FILE_PATH, 'dynamic_child_block_multiple_levels.json')) as f:
            self.__assert_block_run_results(block_factory, json.loads(f.read()), 27)

    def test_execute_sync_with_dynamic_block_and_upstream_dynamic_child_block(self):
        dynamic_child_block = self.block3
        self.pipeline1.add_block(dynamic_child_block, upstream_block_uuids=[
            self.block.uuid,
            self.block2.uuid,
        ])
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        self.__setup_upstream_dynamic_block(
            self.block,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )

        with open(os.path.join(
            CURRENT_FILE_PATH,
            'dynamic_block_and_dynamic_child_block.json',
        )) as f:
            self.__assert_block_run_results(block_factory, json.loads(f.read()), 9)

    def test_execute_sync_with_dynamic_blocks_and_upstream_dynamic_child_blocks(self):
        dynamic_child_block = self.block6
        self.pipeline1.add_block(dynamic_child_block, upstream_block_uuids=[
            self.block.uuid,
            self.block2.uuid,
            self.block3.uuid,
            self.block4.uuid,
            self.block5.uuid,
        ])
        self.pipeline1.add_block(self.block4, upstream_block_uuids=[self.block2.uuid])
        self.pipeline1.add_block(self.block5, upstream_block_uuids=[self.block3.uuid])
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        self.__setup_upstream_dynamic_block(
            self.block2,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )
        self.__setup_upstream_dynamic_block(
            self.block3,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )

        with open(os.path.join(
            CURRENT_FILE_PATH,
            'dynamic_blocks_and_upstream_dynamic_child_blocks.json',
        )) as f:
            self.__assert_block_run_results(block_factory, json.loads(f.read()), 81)

    def test_execute_sync_with_multiple_dynamic_reduce_output_level1(self):
        dynamic_child_block = self.block6
        self.pipeline1.add_block(dynamic_child_block, upstream_block_uuids=[
            self.block.uuid,
            self.block2.uuid,
            self.block3.uuid,
            self.block4.uuid,
            self.block5.uuid,
        ])
        self.pipeline1.add_block(self.block4, upstream_block_uuids=[self.block2.uuid])
        self.pipeline1.add_block(self.block5, upstream_block_uuids=[self.block3.uuid])
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        self.__setup_upstream_dynamic_block(
            self.block2,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )
        self.__setup_upstream_dynamic_block(
            self.block3,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )

        self.__set_reduce_output(self.block4)

        with open(os.path.join(
            CURRENT_FILE_PATH,
            'multiple_dynamic_reduce_output_level1.json',
        )) as f:
            self.__assert_block_run_results(block_factory, json.loads(f.read()), 27)

    def test_execute_sync_with_multiple_dynamic_reduce_output_level1_multiple(self):
        dynamic_child_block = self.block6
        self.pipeline1.add_block(dynamic_child_block, upstream_block_uuids=[
            self.block.uuid,
            self.block2.uuid,
            self.block3.uuid,
            self.block4.uuid,
            self.block5.uuid,
        ])
        self.pipeline1.add_block(self.block4, upstream_block_uuids=[self.block2.uuid])
        self.pipeline1.add_block(self.block5, upstream_block_uuids=[self.block3.uuid])
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        self.__setup_upstream_dynamic_block(
            self.block2,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )
        self.__setup_upstream_dynamic_block(
            self.block3,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )

        self.__set_reduce_output(self.block4)
        self.__set_reduce_output(self.block5)

        with open(os.path.join(
            CURRENT_FILE_PATH,
            'multiple_dynamic_reduce_output_level1_multiple.json',
        )) as f:
            self.__assert_block_run_results(block_factory, json.loads(f.read()), 9)

    def test_execute_sync_with_multiple_dynamic_reduce_output_multiple_levels(self):
        dynamic_child_block = self.block7
        self.pipeline1.add_block(dynamic_child_block, upstream_block_uuids=[
            self.block3.uuid,
            self.block4.uuid,
            self.block5.uuid,
            self.block6.uuid,
        ])
        self.pipeline1.add_block(self.block4, upstream_block_uuids=[self.block2.uuid])
        self.pipeline1.add_block(self.block5, upstream_block_uuids=[self.block3.uuid])
        self.pipeline1.add_block(self.block6, upstream_block_uuids=[self.block4.uuid])
        block_factory = DynamicChildBlockFactory(dynamic_child_block, self.pipeline_run)

        self.__setup_upstream_dynamic_block(
            self.block2,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )
        self.__setup_upstream_dynamic_block(
            self.block3,
            dynamic_child_block,
            build_metadata=lambda index, **kwargs: merge_dict(
                dict(block_uuid=f'custom_uuid_{index}'),
                {},
            ),
        )

        self.__set_reduce_output(self.block5)
        self.__set_reduce_output(self.block6)

        with open(os.path.join(
            CURRENT_FILE_PATH,
            'multiple_dynamic_reduce_output_multiple_levels.json',
        )) as f:
            self.__assert_block_run_results(block_factory, json.loads(f.read()), 9)

    def __assert_block_run_results(
        self,
        block_factory: DynamicChildBlockFactory,
        results: List[Dict],
        final_count: int,
    ):
        count = BlockRun.query.count()
        self.assertEqual(
            results,
            block_factory.execute_sync(execution_partition=self.pipeline_run.execution_partition),
        )
        self.assertEqual(BlockRun.query.count(), count + final_count)

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

    def __setup_upstream_dynamic_block(
        self,
        block: Block,
        dynamic_child_block: Block,
        build_metadata: Callable = None,
        number_of_items: int = 3,
    ):
        self.__set_dynamic(block)
        block.save_outputs(
            [
                dict(
                    variable_uuid='output_0',
                    text_data=[i for i in range(number_of_items)],
                ),
                dict(
                    variable_uuid='output_1',
                    text_data=[merge_dict(
                        dict(mage=i),
                        build_metadata(block=block, index=i) if build_metadata else {},
                    ) for i in range(number_of_items)],
                ),
            ],
            execution_partition=self.pipeline_run.execution_partition,
            override=True,
            override_output_variable=True,
        )

        results = []

        for i in range(number_of_items):
            parts = [
                dynamic_child_block.uuid,
                str(i),
            ]

            metadata = build_metadata(block=block, index=i) if build_metadata else {}
            if 'block_uuid' in metadata:
                parts.append(metadata['block_uuid'])
            else:
                parts.append(str(i))

            results.append(dict(
                block_uuid=':'.join(parts),
                metadata=dict(
                    dynamic_block_index=i,
                    dynamic_block_indexes={
                        block.uuid: i,
                    },
                    metadata={
                        block.uuid: merge_dict(
                            dict(mage=i),
                            metadata,
                        ),
                    },
                ),
            ))

        return results
