# from unittest.mock import patch

# from mage_ai.data_preparation.executors.block_executor import BlockExecutor
# from mage_ai.orchestration.pipeline_scheduler import PipelineScheduler
# from mage_ai.shared.array import find
from mage_ai.tests.data_preparation.models.test_blocks_helper import BlockHelperTest

# from mage_ai.tests.factory import create_pipeline_run_with_schedule


def dynamic1_func(*args, **kwargs):
    arr = [i + 10 for i in range(0, 2)]
    return [
        arr,
        [dict(block_uuid=f'child_{i}') for i in arr],
    ]


def dynamic2_func(*args, **kwargs):
    arr = [i + 20 for i in range(0, 2)]
    return [
        arr,
        [dict(block_uuid=f'child_{i}') for i in arr],
    ]


def child_2x_func(data1, data2, *args, **kwargs):
    return [data1, dict(upstream_data=data2)]


def dynamic_spawn_2x_func(arr, number, **kwargs):
    arr = [arr, kwargs['upstream_data'], number]
    return [
        arr,
    ]


def child_1x_func(data, *args, **kwargs):
    return data


def child_1x_spawn_1x_func(data1, data2, data3, **kwargs):
    return [
        [
            data1,
            data2,
            data3,
            kwargs.get('block_uuid'),
        ],
    ]


def replica_func(*args, **kwargs):
    output = []
    for input_data in args:
        if isinstance(input_data, list):
            for data in input_data:
                output.append(data)
        else:
            output.append(input_data)

    return output


def child_1x_childspawn_1x_reduce_func(*args, **kwargs):
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
    dynamic1: 1 block run but outputs 2 items
    dynamic2: 1 block run but outputs 2 items
    child_2x: 4 block runs
    child_1x: 4 block runs
    dynamic_spawn_2x: 16 block runs
    child_1x_spawn_1x: 128 bock runs (reduces output to 1)
    replica: 16 block runs
    child_1x_childspawn_1x_reduce: 96 block runs
    ---
    Total: 272 (including 1 for each original block’s block run)
    """

    # @patch.multiple(
    #     'mage_ai.settings.server',
    #     DYNAMIC_BLOCKS_V2=True,
    #     MEMORY_MANAGER_PANDAS_V2=True,
    #     MEMORY_MANAGER_POLARS_V2=True,
    #     MEMORY_MANAGER_V2=True,
    #     VARIABLE_DATA_OUTPUT_META_CACHE=True,
    # )
    # def test_execute_sync(self):
    #     configuration_dynamic = dict(dynamic=dict(parent=True, modes=[dict(type='stream')]))
    #     configuration_dynamic_child = dict(
    #         dynamic=dict(modes=[dict(type='stream', poll_interval=0)])
    #     )

    #     dynamic1 = self.create_block(
    #         'dynamic1', func=dynamic1_func, configuration=configuration_dynamic
    #     )
    #     self.pipeline.add_block(dynamic1)

    #     dynamic2 = self.create_block(
    #         'dynamic2', func=dynamic2_func, configuration=configuration_dynamic
    #     )
    #     self.pipeline.add_block(dynamic2)

    #     child_2x = self.create_block(
    #         'child_2x', func=child_2x_func, configuration=configuration_dynamic_child
    #     )
    #     self.pipeline.add_block(child_2x, upstream_block_uuids=[dynamic1.uuid, dynamic2.uuid])

    #     child_1x = self.create_block(
    #         'child_1x', func=child_1x_func, configuration=configuration_dynamic_child
    #     )
    #     self.pipeline.add_block(child_1x, upstream_block_uuids=[child_2x.uuid])

    #     dynamic_spawn_2x = self.create_block(
    #         'dynamic_spawn_2x',
    #         func=dynamic_spawn_2x_func,
    #         configuration=configuration_dynamic_child,
    #     )
    #     self.pipeline.add_block(
    #         dynamic_spawn_2x, upstream_block_uuids=[child_2x.uuid, child_1x.uuid]
    #     )

    #     child_1x_spawn_1x = self.create_block(
    #         'child_1x_spawn_1x',
    #         func=child_1x_spawn_1x_func,
    #         configuration=dict(
    #             dynamic=dict(
    #                 reduce_output=True,
    #                 modes=[dict(type='stream', poll_interval=0)],
    #             )
    #         ),
    #     )
    #     self.pipeline.add_block(
    #         child_1x_spawn_1x,
    #         upstream_block_uuids=[dynamic2.uuid, dynamic_spawn_2x.uuid, child_1x.uuid],
    #     )

    #     child_1x_childspawn_1x_reduce = self.create_block(
    #         'child_1x_childspawn_1x_reduce',
    #         func=child_1x_childspawn_1x_reduce_func,
    #         configuration=configuration_dynamic_child,
    #     )

    #     replica = self.create_block(
    #         'replica',
    #         func=replica_func,
    #         configuration=dict(
    #             dynamic=dict(
    #                 parent=True,
    #                 modes=[dict(type='stream', poll_interval=0)],
    #             ),
    #         ),
    #     )
    #     replica.replicated_block = child_1x_childspawn_1x_reduce.uuid

    #     self.pipeline.add_block(
    #         replica,
    #         upstream_block_uuids=[dynamic_spawn_2x.uuid, child_1x_spawn_1x.uuid],
    #     )
    #     self.pipeline.add_block(
    #         child_1x_childspawn_1x_reduce,
    #         upstream_block_uuids=[dynamic1.uuid, child_1x_spawn_1x.uuid, replica.uuid],
    #     )

    #     pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid=self.pipeline.uuid)
    #     scheduler = PipelineScheduler(pipeline_run=pipeline_run)
    #     scheduler.schedule()

    #     self.assertEqual(len(pipeline_run.block_runs), 8)

    #     completes = [
    #         [dynamic1.uuid, dynamic2.uuid],
    #         [child_2x.build_dynamic_uuid(i) for i in range(4)],
    #         [child_2x.uuid],
    #         [child_1x.build_dynamic_uuid(i) for i in range(4)],
    #         [child_1x.uuid],
    #         [dynamic_spawn_2x.build_dynamic_uuid(i) for i in range(16)],
    #         [dynamic_spawn_2x.uuid],
    #         [child_1x_spawn_1x.build_dynamic_uuid(i) for i in range(128)]
    #         + [replica.build_dynamic_uuid(i) for i in range(16)],
    #         [child_1x_spawn_1x.uuid, replica.uuid_replicated],
    #         [child_1x_childspawn_1x_reduce.build_dynamic_uuid(i) for i in range(96)],
    #         [child_1x_childspawn_1x_reduce.uuid],
    #     ]

    #     for loop, block_uuids in enumerate(completes):
    #         print(f'Loop: {loop}\n')
    #         for block_run in pipeline_run.block_runs:
    #             if block_run.status == block_run.BlockRunStatus.COMPLETED:
    #                 continue
    #             block_executor = BlockExecutor(
    #                 self.pipeline,
    #                 block_run.block_uuid,
    #                 execution_partition=pipeline_run.execution_partition,
    #                 block_run_id=block_run.id,
    #             )
    #             block_executor.execute(block_run_id=block_run.id, skip_logging=True)

    #         block_runs_completed = [
    #             br for br in pipeline_run.block_runs if br.status == br.BlockRunStatus.COMPLETED
    #         ]
    #         for block_uuid in block_uuids:
    #             block_run = find(
    #                 lambda br, block_uuid=block_uuid: br.block_uuid == block_uuid,
    #                 block_runs_completed,
    #             )
    #             self.assertIsNotNone(block_run)

    #     self.assertEqual(len(pipeline_run.block_runs), 272)
    #     self.assertEqual(
    #         [br for br in pipeline_run.block_runs if br.status == br.BlockRunStatus.COMPLETED],
    #         pipeline_run.block_runs,
    #     )

    # @patch.multiple(
    #     'mage_ai.settings.server',
    #     DYNAMIC_BLOCKS_V2=True,
    #     MEMORY_MANAGER_PANDAS_V2=True,
    #     MEMORY_MANAGER_POLARS_V2=True,
    #     MEMORY_MANAGER_V2=True,
    #     VARIABLE_DATA_OUTPUT_META_CACHE=True,
    # )
    # def test_execute_sync_with_less_dynamic_blocks(self):
    #     configuration_dynamic = dict(dynamic=dict(parent=True, modes=[dict(type='stream')]))
    #     configuration_dynamic_child = dict(
    #         dynamic=dict(modes=[dict(type='stream', poll_interval=0)])
    #     )

    #     dynamic1 = self.create_block(
    #         'dynamic1', func=dynamic1_func, configuration=configuration_dynamic
    #     )
    #     self.pipeline.add_block(dynamic1)

    #     # Not dynamic
    #     dynamic2 = self.create_block(
    #         'dynamic2',
    #         func=dynamic2_func,
    #     )
    #     self.pipeline.add_block(dynamic2)

    #     child_2x = self.create_block(
    #         'child_2x', func=child_2x_func, configuration=configuration_dynamic_child
    #     )
    #     self.pipeline.add_block(child_2x, upstream_block_uuids=[dynamic1.uuid, dynamic2.uuid])

    #     child_1x = self.create_block(
    #         'child_1x', func=child_1x_func, configuration=configuration_dynamic_child
    #     )
    #     self.pipeline.add_block(child_1x, upstream_block_uuids=[child_2x.uuid])

    #     dynamic_spawn_2x = self.create_block(
    #         'dynamic_spawn_2x',
    #         func=dynamic_spawn_2x_func,
    #         configuration=configuration_dynamic_child,
    #     )
    #     self.pipeline.add_block(
    #         dynamic_spawn_2x, upstream_block_uuids=[child_2x.uuid, child_1x.uuid]
    #     )

    #     child_1x_spawn_1x = self.create_block(
    #         'child_1x_spawn_1x',
    #         func=child_1x_spawn_1x_func,
    #         configuration=dict(
    #             dynamic=dict(
    #                 reduce_output=True,
    #                 modes=[dict(type='stream', poll_interval=0)],
    #             )
    #         ),
    #     )
    #     self.pipeline.add_block(
    #         child_1x_spawn_1x,
    #         upstream_block_uuids=[dynamic2.uuid, dynamic_spawn_2x.uuid, child_1x.uuid],
    #     )

    #     child_1x_childspawn_1x_reduce = self.create_block(
    #         'child_1x_childspawn_1x_reduce',
    #         func=child_1x_childspawn_1x_reduce_func,
    #         configuration=configuration_dynamic_child,
    #     )

    #     # Not dynamic
    #     replica = self.create_block(
    #         'replica',
    #         func=replica_func,
    #         configuration=dict(
    #             dynamic=dict(
    #                 modes=[dict(type='stream', poll_interval=0)],
    #             ),
    #         ),
    #     )
    #     replica.replicated_block = child_1x_childspawn_1x_reduce.uuid

    #     self.pipeline.add_block(
    #         replica,
    #         upstream_block_uuids=[dynamic_spawn_2x.uuid, child_1x_spawn_1x.uuid],
    #     )
    #     self.pipeline.add_block(
    #         child_1x_childspawn_1x_reduce,
    #         upstream_block_uuids=[dynamic1.uuid, child_1x_spawn_1x.uuid, replica.uuid],
    #     )

    #     pipeline_run = create_pipeline_run_with_schedule(pipeline_uuid=self.pipeline.uuid)
    #     scheduler = PipelineScheduler(pipeline_run=pipeline_run)
    #     scheduler.schedule()

    #     self.assertEqual(len(pipeline_run.block_runs), 8)

    #     completes = [
    #         [dynamic1.uuid, dynamic2.uuid],
    #         [child_2x.build_dynamic_uuid(i) for i in range(2)],
    #         [child_2x.uuid],
    #         [child_1x.build_dynamic_uuid(i) for i in range(2)],
    #         [child_1x.uuid],
    #         [dynamic_spawn_2x.build_dynamic_uuid(i) for i in range(4)],
    #         [dynamic_spawn_2x.uuid],
    #         [child_1x_spawn_1x.build_dynamic_uuid(i) for i in range(8)]
    #         + [replica.build_dynamic_uuid(i) for i in range(4)],
    #         [child_1x_spawn_1x.uuid, replica.uuid_replicated],
    #         [child_1x_childspawn_1x_reduce.build_dynamic_uuid(i) for i in range(8)],
    #         [child_1x_childspawn_1x_reduce.uuid],
    #     ]

    #     for loop, block_uuids in enumerate(completes):
    #         print(f'Loop: {loop}\n')
    #         for block_run in pipeline_run.block_runs:
    #             if block_run.status == block_run.BlockRunStatus.COMPLETED:
    #                 continue
    #             block_executor = BlockExecutor(
    #                 self.pipeline,
    #                 block_run.block_uuid,
    #                 execution_partition=pipeline_run.execution_partition,
    #                 block_run_id=block_run.id,
    #             )
    #             block_executor.execute(block_run_id=block_run.id, skip_logging=True)

    #         block_runs_completed = [
    #             br for br in pipeline_run.block_runs if br.status == br.BlockRunStatus.COMPLETED
    #         ]
    #         for block_uuid in block_uuids:
    #             block_run = find(
    #                 lambda br, block_uuid=block_uuid: br.block_uuid == block_uuid,
    #                 block_runs_completed,
    #             )
    #             self.assertIsNotNone(block_run)

    #     self.assertEqual(len(pipeline_run.block_runs), 36)
    #     self.assertEqual(
    #         [br for br in pipeline_run.block_runs if br.status == br.BlockRunStatus.COMPLETED],
    #         pipeline_run.block_runs,
    #     )
