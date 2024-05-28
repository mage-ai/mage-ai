from unittest.mock import patch

from mage_ai.data_preparation.models.block.dynamic.factory import DynamicBlockFactory
from mage_ai.tests.data_preparation.models.test_blocks_helper import BlockHelperTest


def dynamic1(*args, **kwargs):
    arr = [i + 10 for i in range(0, 2)]
    return [
        arr,
        [dict(block_uuid=f'child_{i}') for i in arr],
    ]


def dynamic2(*args, **kwargs):
    arr = [i + 20 for i in range(0, 2)]
    return [
        arr,
        [dict(block_uuid=f'child_{i}') for i in arr],
    ]


def child2x(data1, data2, *args, **kwargs):
    return [data1, dict(upstream_data=data2)]


def dynamic_spawn_2x(arr, number, **kwargs):
    arr = [arr, kwargs['upstream_data'], number]
    return [
        arr,
    ]


def child1x(data, *args, **kwargs):
    return data


def child_1x_spawn_1x(data1, data2, data3, **kwargs):
    return [
        [
            data1,
            data2,
            data3,
            kwargs.get('block_uuid'),
        ],
    ]


def replica(*args, **kwargs):
    output = []
    for input_data in args:
        if isinstance(input_data, list):
            for data in input_data:
                output.append(data)
        else:
            output.append(input_data)

    return output


def child_1x_childspawn_1x_reduce(*args, **kwargs):
    output = []
    for input_data in args:
        if isinstance(input_data, list):
            for data in input_data:
                output.append(data)
        else:
            output.append(input_data)

    return output


class DynamicBlockFactoryTest(BlockHelperTest):
    """
    dynamic1: 2
    dynamic2: 2
    child_2x: 4 = 4
    child_1x: 4 = 4
    dynamic_spawn_2x: 4*4 = 16 = 16
    child_1x_spawn_1x: 16 * 4 * 2 = 128 = 128
    replica: 16 * 1 = 16 = 16
    child_1x_childspawn_1x_reduce: 16 * 1 * 2 = 32 = 32
    ---
    Total: 8 + 4 + 4 + 16 + 128 + 16 + 32 = 208
    """

    def setUp(self):
        super().setUp()

    def test_is_complete(self):
        pass

    @patch.multiple(
        'mage_ai.settings.server',
        DYNAMIC_BLOCKS_V2=True,
        MEMORY_MANAGER_PANDAS_V2=True,
        MEMORY_MANAGER_POLARS_V2=True,
        MEMORY_MANAGER_V2=True,
        VARIABLE_DATA_OUTPUT_META_CACHE=True,
    )
    def test_execute_sync(self):
        block = self.create_block(
            func=dynamic1,
            configuration=dict(
                variables=dict(
                    write=dict(
                        batch_settings=dict(
                            items=dict(maximum=99),
                        )
                    )
                ),
            ),
        )
        self.pipeline.add_block(block)
        DynamicBlockFactory(block)

        # block.execute_sync(execution_partition='multiverse')
