import inspect
import os
from typing import Callable, Optional
from unittest.mock import patch

from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dynamic.utils import (
    build_combinations_for_dynamic_child,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.tests.api.operations.test_base import BaseApiTestCase
from mage_ai.tests.factory import create_pipeline


def load_data1(*args, **kwargs):
    arr = [i + 10 for i in range(0, 2)]
    return [
        arr,
        [dict(block_uuid=f'child_{i}') for i in arr],
    ]


def load_data2(*args, **kwargs):
    arr = [i + 20 for i in range(0, 1)]
    return [
        arr,
        [dict(block_uuid=f'child_{i}') for i in arr],
    ]


def transform_multiple(data1, data2, *args, **kwargs):
    return [data1, dict(upstream_data=data2)]


def transform(data, *args, **kwargs):
    return data


def transform_2_1(arr, number, **kwargs):
    arr = [arr, 0, number]
    return [
        arr,
    ]


def multiple_inputs(data1, data2, data3, **kwargs):
    return [
        [
            data1,
            data2,
            data3,
            kwargs.get('block_uuid'),
        ],
    ]


def export_data(*args, **kwargs):
    output = []
    for input_data in args:
        if isinstance(input_data, list):
            for data in input_data:
                output.append(data)
        else:
            output.append(input_data)

    return [
        output,
    ]


def load_pandas_dataframe(*args, **kwargs):
    from mage_ai.data.tabular.mocks import create_dataframe

    return [
        create_dataframe(n_rows=2, use_pandas=True),
        [dict(block_uuid='child_0'), dict(block_uuid='child_1')],
    ]


def load_polars_dataframe(*args, **kwargs):
    from mage_ai.data.tabular.mocks import create_dataframe

    return [
        create_dataframe(n_rows=1, use_pandas=False),
        [dict(block_uuid='child_2')],
    ]


class DynamicBlockCombinationTest(BaseApiTestCase):
    def setUp(self):
        super().setUp()
        self.pipeline = create_pipeline(self.faker.unique.name(), self.repo_path)

    def create_block(
        self,
        name: Optional[str] = None,
        content: Optional[str] = None,
        func: Optional[Callable] = None,
        **kwargs,
    ):
        block = Block.create(
            name or self.faker.unique.name(),
            BlockType.TRANSFORMER,
            self.pipeline.repo_path,
            language=BlockLanguage.PYTHON,
            **kwargs,
        )

        if func:
            content = inspect.getsource(func)

        if content:
            block.update_content(f'@{block.type}\n{content}')

        return block

    def test_combos(self):
        with patch.dict(os.environ, {'MEMORY_MANAGER_VERSION': '2'}):
            with patch.dict(os.environ, {'MEMORY_MANAGER_POLARS_VERSION': '2'}):
                dynamic1 = self.create_block(
                    name='dynamic1', func=load_pandas_dataframe, configuration=dict(dynamic=True)
                )
                self.pipeline.add_block(dynamic1)

                dynamic2 = self.create_block(
                    name='dynamic2', func=load_polars_dataframe, configuration=dict(dynamic=True)
                )
                self.pipeline.add_block(dynamic2)

                child2x = self.create_block(name='child2x', func=transform_multiple)
                self.pipeline.add_block(
                    child2x, upstream_block_uuids=[dynamic1.uuid, dynamic2.uuid]
                )

                child1x = self.create_block(name='child1x', func=transform)
                self.pipeline.add_block(child1x, upstream_block_uuids=[child2x.uuid])

                dynamic_spawn_2x = self.create_block(
                    name='dynamic_spawn_2x',
                    func=transform_2_1,
                    configuration=dict(dynamic=True),
                )
                self.pipeline.add_block(
                    dynamic_spawn_2x, upstream_block_uuids=[child2x.uuid, child1x.uuid]
                )

                child_1x_spawn_1x = self.create_block(
                    name='child_1x_spawn_1x',
                    func=multiple_inputs,
                    configuration=dict(reduce_output=True),
                )
                self.pipeline.add_block(
                    child_1x_spawn_1x,
                    upstream_block_uuids=[dynamic2.uuid, child1x.uuid, dynamic_spawn_2x.uuid],
                )

                replica = self.create_block(name='replica', configuration=dict(dynamic=True))

                child_1x_childspawn_1x_reduce = self.create_block(
                    name='child_1x_childspawn_1x_reduce', func=export_data
                )

                replica.replicated_block = child_1x_childspawn_1x_reduce.uuid
                self.pipeline.add_block(
                    replica, upstream_block_uuids=[dynamic_spawn_2x.uuid, child_1x_spawn_1x.uuid]
                )
                self.pipeline.add_block(
                    child_1x_childspawn_1x_reduce,
                    upstream_block_uuids=[dynamic1.uuid, child_1x_spawn_1x.uuid, replica.uuid],
                )

                dynamic1.execute_sync()
                dynamic2.execute_sync()

                child_data1 = dynamic1.get_variable_object(
                    dynamic1.uuid, variable_uuid='output_0'
                ).read_data()
                metadata1 = dynamic1.get_variable_object(
                    dynamic1.uuid, variable_uuid='output_1'
                ).read_data()
                # self.assertEqual(len(child_data1), len(metadata1))
                self.assertEqual(len(child_data1), 2)

                print('dynamic1')
                print(child_data1, metadata1)

                child_data2 = dynamic2.get_variable_object(
                    dynamic2.uuid, variable_uuid='output_0'
                ).read_data()
                metadata2 = dynamic2.get_variable_object(
                    dynamic2.uuid, variable_uuid='output_1'
                ).read_data()
                # self.assertEqual(len(child_data2), len(metadata2))
                self.assertEqual(len(child_data2), 1)

                print('dynamic2')
                print(child_data2, metadata2)

                child2x_outputs = []
                child2x_metadata = []
                child2x_combos = build_combinations_for_dynamic_child(child2x)
                for i, combo in enumerate(child2x_combos):
                    child2x.execute_sync(dynamic_block_index=i)
                    out0 = child2x.get_variable_object(
                        child2x.uuid, dynamic_block_index=i, variable_uuid='output_0'
                    ).read_data()
                    print('child2x', i, combo)
                    print(out0)
                    out1 = child2x.get_variable_object(
                        child2x.uuid, dynamic_block_index=i, variable_uuid='output_1'
                    ).read_data()
                    child2x_outputs.append(out0)
                    child2x_metadata.append(out1)

                self.assertEqual(len(child2x_outputs), len(child2x_metadata))
                self.assertEqual(len(child2x_outputs), len(child_data1) * len(child_data2))
                self.assertEqual(len(child2x_outputs), 2)

                print(child2x_outputs, child2x_metadata)

                child1x_outputs = []
                for i, _combo in enumerate(child2x_outputs):
                    child1x.execute_sync(dynamic_block_index=i)
                    out0 = child1x.get_variable_object(
                        child1x.uuid, dynamic_block_index=i, variable_uuid='output_0'
                    ).read_data()
                    child1x_outputs.append(out0)
                self.assertEqual(len(child1x_outputs), len(child2x_outputs))
                self.assertEqual(len(child1x_outputs), 2)

                dynamic_spawn_2x_outputs = []
                dynamic_spawn_2x_combos = build_combinations_for_dynamic_child(dynamic_spawn_2x)
                for i in range(len(dynamic_spawn_2x_combos)):
                    dynamic_spawn_2x.execute_sync(dynamic_block_index=i)
                    out = dynamic_spawn_2x.get_variable_object(
                        dynamic_spawn_2x.uuid, dynamic_block_index=i, variable_uuid='output_0'
                    ).read_data()
                    dynamic_spawn_2x_outputs.append(out)
                self.assertEqual(
                    len(dynamic_spawn_2x_outputs), len(child1x_outputs) * len(child2x_outputs)
                )
                self.assertEqual(len(dynamic_spawn_2x_outputs), 4)

                child_1x_spawn_1x_outputs = []
                child_1x_spawn_1x_combos = build_combinations_for_dynamic_child(child_1x_spawn_1x)
                for i in range(len(child_1x_spawn_1x_combos)):
                    child_1x_spawn_1x.execute_sync(dynamic_block_index=i)
                    out = child_1x_spawn_1x.get_variable_object(
                        child_1x_spawn_1x.uuid, dynamic_block_index=i, variable_uuid='output_0'
                    ).read_data()
                    child_1x_spawn_1x_outputs.append(out)
                self.assertEqual(
                    len(child_1x_spawn_1x_outputs),
                    (
                        # Creates 1 child
                        len(child_data2)
                        *
                        # Creates 2 children
                        len(child1x_outputs)
                        *
                        # So far, thats 2
                        # To calculate the rest, we take the number of children created
                        # and multiply by the number of items produced by that child:
                        # 4 * 3 items each
                        # 4 children:
                        # [[10, 20, [10]], [11, 20, [11]], [10, 20, [10]], [11, 20, [11]]]
                        # Sum the count of items across all children: 3 + 3 + 3 + 3 = 12
                        # 12 * 2 = 24
                        sum([len(arr) for arr in dynamic_spawn_2x_outputs])  # 12
                    ),
                )
                self.assertEqual(len(child_1x_spawn_1x_outputs), 24)

                replica_outputs = []  # A lot
                replica_combos = build_combinations_for_dynamic_child(replica)
                for i, _combo in enumerate(replica_combos):
                    replica.execute_sync(dynamic_block_index=i)
                    out0 = replica.get_variable_object(
                        replica.uuid, dynamic_block_index=i, variable_uuid='output_0'
                    ).read_data()
                    replica_outputs.append(out0)
                self.assertEqual(
                    # child_1x_spawn_1x reduces output to 1, so we exclude it
                    len(replica_outputs),
                    # Dynamic and dynamic child: 12
                    sum([len(arr) for arr in dynamic_spawn_2x_outputs]),
                )
                self.assertEqual(len(replica_outputs), 12)

    #             # Skip this one
    #             child_1x_childspawn_1x_reduce_outputs = []
    #             child_1x_childspawn_1x_reduce_combos = build_combinations_for_dynamic_child(
    #                 child_1x_childspawn_1x_reduce
    #             )
    #             for i, _combo in enumerate(child_1x_childspawn_1x_reduce_combos):
    #                 child_1x_childspawn_1x_reduce.execute_sync(dynamic_block_index=i)
    #                 out0 = child_1x_childspawn_1x_reduce.get_variable_object(
    #                     child_1x_childspawn_1x_reduce.uuid,
    #                     dynamic_block_index=i,
    #                     variable_uuid='output_0',
    #                 ).read_data()
    #                 child_1x_childspawn_1x_reduce_outputs.append(out0)

    #             # child_1x_spawn_1x reduces output to 1
    #             self.assertEqual(len(child_1x_childspawn_1x_reduce_outputs), 648)
