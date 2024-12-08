from functools import reduce
from typing import Any, Dict, Optional
from unittest.mock import patch

from mage_ai.data_preparation.models.block.dynamic.data import (
    calculate_dynamic_index_data_index,
)
from mage_ai.tests.data_preparation.models.test_blocks_helper import BlockHelperTest


def block1_func(*args, **kwargs):
    return 99


def dynamic1_func(*args, **kwargs):
    return [[1, 2], [dict(meta1=1), dict(meta1=2)]]


def dynamic2_func(*args, **kwargs):
    return [[3, 4, 5], [dict(meta2=3), dict(meta2=4), dict(meta2=5)]]


def dynamic3_func(*args, **kwargs):
    return [[6, 7], [dict(meta3=6), dict(meta3=7)]]


def child1_func(data1, data2, data3, *args, **kwargs):
    return [
        f'{data1}-{data2}-{data3}',
        dict(
            meta4=kwargs.get('meta1'),
            meta5=kwargs.get('meta2'),
            meta6=kwargs.get('meta3'),
        ),
    ]


def child2_func(data1, data2, *args, **kwargs):
    return [
        f'{data1}-{data2}',
        dict(
            meta1=kwargs.get('meta1'),
            meta4=kwargs.get('meta4'),
            meta5=kwargs.get('meta5'),
            meta6=kwargs.get('meta6'),
        ),
    ]


def reduce1_func(data1, data2, data3, *args, **kwargs):
    return [[data1, data2, data3]]


def reduce1_child1_func(data, *args, **kwargs):
    arr = []
    for item in data:
        if isinstance(item, list):
            arr += [i for s in item for i in s]
        else:
            arr.append(item)
    return [arr]


def func1(**kwargs):
    return [
        [
            dict(partner_id=1, filename='name1.py'),
            dict(partner_id=2, filename='name2.py'),
            dict(partner_id=3, filename='name3.py'),
        ],
    ]


def func2(data, **kwargs):
    return data


def func3(data, **kwargs):
    return data


class DynamicBlockVariableDataTest(BlockHelperTest):
    def test_calculate_index(self):
        data1 = [
            [1, 2],
            [3, 4, 5],
            [6, 7, 8, 9],
        ]

        data2 = [
            [1, 2, 3],
            [4, 5, 6],
        ]

        values_correct1 = [
            [1, 3, 6],
            [1, 3, 7],
            [1, 3, 8],
            [1, 3, 9],
            [1, 4, 6],
            [1, 4, 7],
            [1, 4, 8],
            [1, 4, 9],
            [1, 5, 6],
            [1, 5, 7],
            [1, 5, 8],
            [1, 5, 9],
            [2, 3, 6],
            [2, 3, 7],
            [2, 3, 8],
            [2, 3, 9],
            [2, 4, 6],
            [2, 4, 7],
            [2, 4, 8],
            [2, 4, 9],
            [2, 5, 6],
            [2, 5, 7],
            [2, 5, 8],
            [2, 5, 9],
        ]

        values_correct2 = [
            [1, 4],
            [1, 5],
            [1, 6],
            [2, 4],
            [2, 5],
            [2, 6],
            [3, 4],
            [3, 5],
            [3, 6],
        ]

        for data, values_correct in [(data1, values_correct1), (data2, values_correct2)]:
            blocks = [i for i in range(reduce(lambda a, b: a * b, [len(arr) for arr in data], 1))]

            values = []
            for dynamic_block_index in blocks:
                value = []
                for upstream_index, arr in enumerate(data):
                    child_data_count = len(arr)
                    select_index = calculate_dynamic_index_data_index(
                        dynamic_block_index,
                        upstream_index,
                        child_data_count,
                        [len(arr) for arr in data],
                    )
                    val = arr[select_index]
                    value.append(val)
                values.append(value)

            self.assertEqual(sorted(values), sorted(values_correct))

    @patch.multiple(
        'mage_ai.settings.server',
        DYNAMIC_BLOCKS_V2=False,
        MEMORY_MANAGER_PANDAS_V2=False,
        MEMORY_MANAGER_POLARS_V2=False,
        MEMORY_MANAGER_V2=False,
        VARIABLE_DATA_OUTPUT_META_CACHE=False,
    )
    def test_variables(self):
        config = dict(dynamic=True)
        config_child = dict(reduce_output=True)
        self.__run_with_configs(config, config_child)

    @patch.multiple(
        'mage_ai.settings.server',
        DYNAMIC_BLOCKS_V2=True,
        MEMORY_MANAGER_PANDAS_V2=True,
        MEMORY_MANAGER_POLARS_V2=True,
        MEMORY_MANAGER_V2=True,
        VARIABLE_DATA_OUTPUT_META_CACHE=True,
    )
    def test_variables_v2(self):
        # modes=[dict(type='stream')]
        config = dict(dynamic=dict(parent=True))
        config_child = dict(dynamic=dict(reduce_output=True))
        self.__run_with_configs(config, config_child)

    @patch.multiple(
        'mage_ai.settings.server',
        DYNAMIC_BLOCKS_V2=True,
        MEMORY_MANAGER_PANDAS_V2=True,
        MEMORY_MANAGER_POLARS_V2=True,
        MEMORY_MANAGER_V2=True,
        VARIABLE_DATA_OUTPUT_META_CACHE=True,
    )
    def test_variables_v2_stream(self):
        # modes=[dict(type='stream')]
        config = dict(
            dynamic=dict(
                parent=True,
                modes=[
                    dict(type='stream'),
                ],
            ),
        )
        config_child = dict(
            dynamic=dict(
                parent=False,
                reduce_output=True,
                modes=[
                    dict(
                        type='stream',
                        poll_interval=1,
                    ),
                ],
            )
        )
        self.__run_with_configs(config, config_child)

    @patch.multiple(
        'mage_ai.settings.server',
        DYNAMIC_BLOCKS_V2=True,
        MEMORY_MANAGER_PANDAS_V2=True,
        MEMORY_MANAGER_POLARS_V2=True,
        MEMORY_MANAGER_V2=True,
        VARIABLE_DATA_OUTPUT_META_CACHE=True,
    )
    def test_reduce_output_when_dynamic_child_returns_1_item(self):
        config = dict(
            dynamic=dict(
                parent=True,
            ),
        )
        config_child = dict(
            dynamic=dict(
                parent=False,
                reduce_output=True,
            )
        )

        block1 = self.create_block('block1', func=func1, configuration=config)
        block2 = self.create_block('block2', func=func2, configuration=config_child)
        block3 = self.create_block('block3', func=func3)
        self.pipeline.add_block(block1)
        self.pipeline.add_block(block2, upstream_block_uuids=[block1.uuid])
        self.pipeline.add_block(block3, upstream_block_uuids=[block2.uuid])

        block1.execute_sync()

        for i in range(3):
            block2.execute_sync(dynamic_block_index=i)
        for i in range(1):
            block3.execute_sync(dynamic_block_index=i)

        reduce_output_data = [
            block3.get_variable_object(
                dynamic_block_index=0,
                variable_uuid=f'output_{i}',
            ).read_data()
            for i in range(3)
        ]

        self.assertEqual(
            reduce_output_data,
            [
                dict(partner_id=1, filename='name1.py'),
                dict(partner_id=2, filename='name2.py'),
                dict(partner_id=3, filename='name3.py'),
            ],
        )

    def __run_with_configs(
        self, config: Dict[str, Any], config_child: Optional[Dict[str, Any]] = None
    ):
        dynamic1 = self.create_block('dynamic1', func=dynamic1_func, configuration=config)
        dynamic2 = self.create_block('dynamic2', func=dynamic2_func, configuration=config)
        dynamic3 = self.create_block('dynamic3', func=dynamic3_func, configuration=config)
        block1 = self.create_block('block1', func=block1_func)
        self.pipeline.add_block(dynamic1)
        self.pipeline.add_block(dynamic2)
        self.pipeline.add_block(dynamic3)
        self.pipeline.add_block(block1)

        child1 = self.create_block('child1', func=child1_func)
        self.pipeline.add_block(
            child1, upstream_block_uuids=[dynamic1.uuid, dynamic2.uuid, dynamic3.uuid]
        )

        reduce1 = self.create_block('reduce1', func=reduce1_func, configuration=config_child)
        self.pipeline.add_block(
            reduce1, upstream_block_uuids=[dynamic2.uuid, dynamic3.uuid, block1.uuid]
        )

        reduce1_child1 = self.create_block('reduce1_child1', func=reduce1_child1_func)
        self.pipeline.add_block(reduce1_child1, upstream_block_uuids=[reduce1.uuid])

        child2 = self.create_block('child2', func=child2_func)
        self.pipeline.add_block(
            child2,
            upstream_block_uuids=[dynamic1.uuid, child1.uuid],
        )

        dynamic1.execute_sync()
        dynamic2.execute_sync()
        dynamic3.execute_sync()
        block1.execute_sync()
        dynamic1_output0 = dynamic1.get_variable_object(variable_uuid='output_0').read_data()
        dynamic2_output0 = dynamic2.get_variable_object(variable_uuid='output_0').read_data()
        dynamic3_output0 = dynamic3.get_variable_object(variable_uuid='output_0').read_data()
        # block1_output0 = block1.get_variable_object(variable_uuid='output_0').read_data()

        parent_item_count = len(dynamic1_output0) * len(dynamic2_output0) * len(dynamic3_output0)

        child1_output0s = []
        child1_output1s = []
        for i in range(parent_item_count):
            child1.execute_sync(dynamic_block_index=i)
            child1_output0s.append(
                child1.get_variable_object(
                    dynamic_block_index=i, variable_uuid='output_0'
                ).read_data()
            )
            child1_output1s.append(
                child1.get_variable_object(
                    dynamic_block_index=i, variable_uuid='output_1'
                ).read_data()
            )

        self.assertEqual(len(child1_output0s), 12)
        self.assertEqual(len(child1_output1s), 12)
        self.assertEqual(sorted(list(set(child1_output0s))), sorted(child1_output0s))
        self.assertEqual(
            sorted([
                '-'.join([str(k) for k in [md['meta4'], md['meta5'], md['meta6']]])
                for md in child1_output1s
            ]),
            sorted(child1_output0s),
        )

        reduce1_output0s = []
        reduce1_output1s = []
        for i in range(len(dynamic2_output0) * len(dynamic3_output0)):
            reduce1.execute_sync(dynamic_block_index=i)
            reduce1_output0s.append(
                reduce1.get_variable_object(
                    dynamic_block_index=i, variable_uuid='output_0'
                ).read_data()
            )
            reduce1_output1s.append(
                reduce1.get_variable_object(
                    dynamic_block_index=i, variable_uuid='output_1'
                ).read_data()
            )

        self.assertEqual(len(reduce1_output0s), 6)
        self.assertEqual(len(reduce1_output0s), len(reduce1_output1s))

        self.assertEqual(
            sorted(list(set([str(v) for v in reduce1_output0s]))),
            sorted([str(v) for v in reduce1_output0s]),
        )

        reduce1_child1.execute_sync()
        reduce1_child1_output0 = reduce1_child1.get_variable_object(
            variable_uuid='output_0'
        ).read_data()
        self.assertEqual(
            sum(reduce1_child1_output0),
            sum([3, 6, 99, 3, 7, 99, 4, 6, 99, 4, 7, 99, 5, 6, 99, 5, 7, 99]),
        )
        self.assertEqual(len(reduce1_child1_output0), 18)

        child2_output0s = []
        child2_output1s = []
        for i in range(len(dynamic1_output0) * len(child1_output0s)):
            child2.execute_sync(dynamic_block_index=i)
            child2_output0s.append(
                child2.get_variable_object(
                    dynamic_block_index=i, variable_uuid='output_0'
                ).read_data()
            )
            child2_output1s.append(
                child2.get_variable_object(
                    dynamic_block_index=i, variable_uuid='output_1'
                ).read_data()
            )

        vals = []
        for row1 in dynamic1_output0:
            for row2 in child1_output0s:
                vals.append(f'{row1}-{row2}')

        # for row, row2 in zip(sorted(child2_output0s), sorted(vals)):
        #     self.assertEqual(row, row2)

        self.assertEqual(len(child2_output0s), 24)

        self.assertEqual(sorted(list(set(child2_output0s))), sorted(child2_output0s))

        self.assertEqual(
            len(
                set(
                    sorted([
                        '-'.join([
                            str(k) for k in [md['meta1'], md['meta4'], md['meta5'], md['meta6']]
                        ])
                        for md in child2_output1s
                    ])
                )
            ),
            len(child2_output0s),
        )
