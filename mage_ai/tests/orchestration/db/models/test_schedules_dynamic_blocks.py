from unittest.mock import patch

from mage_ai.data_preparation.models.block.settings.dynamic.constants import ModeType
from mage_ai.orchestration.db.models.schedules import BlockRun
from mage_ai.tests.data_preparation.models.test_blocks_helper import (
    BlockHelperTest,
    load_dataframe,
    load_dynamic_block_child_data,
    passthrough,
)
from mage_ai.tests.factory import create_pipeline_run


class PipelineRunWithDynamicBlocksTests(BlockHelperTest):
    def setUp(self):
        super().setUp()

    def tearDown(self):
        BlockRun.query.delete()
        self.pipeline.delete()
        super().tearDown()

    @patch.multiple('mage_ai.settings.server', DYNAMIC_BLOCKS_V2=True)
    def test_executable_block_runs(self):
        """
        Combinations of upstream blocks:
            - Basic
            - Dynamic
            - Dynamic child
            - Dynamic duo
            - Reduce output

        Base structure: 14 blocks
        block1
        |   dynamic1
        |   |---dynamic1_child1a
        |   |   |---dynamic1_child1a_reduce1a
        |   |---|---dynamic1_child1a_dynamic
        |   |   |   |---end1
        |---|---dynamic1_child2a
                |---dynamic1_child1a_child2a_reduce2a (also depends on dynamic1_child1a)
                    |---end2 (also depends on dynamic1_child1a_reduce1a)

        block2
        |---end3
        |---end4 (also depends on block1)
        |---dynamic2
            | |-dynamic2_child1b
            | | |---dynamic2_child1b_reduce1b
            |-------dynamic2_child1b_dynamic
            |---dynamic2_child2b
            | |-|---dynamic2_child1b_child2b_reduce2b
        """

        # Basic blocks
        block1 = self.create_block('block1', func=load_dataframe)
        self.pipeline.add_block(block1)
        block2 = self.create_block('block2', func=load_dataframe)
        self.pipeline.add_block(block2)

        # Dynamic blocks
        dynamic1 = self.create_block(
            'dynamic1',
            func=load_dynamic_block_child_data,
            configuration=dict(
                dynamic=dict(parent=True, modes=[dict(type=ModeType.STREAM.value)]),
            ),
        )
        self.pipeline.add_block(dynamic1)

        dynamic2 = self.create_block(
            'dynamic2',
            func=load_dynamic_block_child_data,
            configuration=dict(
                dynamic=dict(parent=True, modes=[dict(type=ModeType.STREAM.value)]),
            ),
        )
        self.pipeline.add_block(dynamic2, upstream_block_uuids=[block2.uuid])

        # Dynamic children
        dynamic1_child1a = self.create_block('dynamic1_child1a', func=passthrough)
        self.pipeline.add_block(dynamic1_child1a, upstream_block_uuids=[dynamic1.uuid])

        dynamic1_child2a = self.create_block('dynamic1_child2a', func=passthrough)
        self.pipeline.add_block(
            dynamic1_child2a, upstream_block_uuids=[dynamic1.uuid, block1.uuid]
        )

        dynamic2_child1b = self.create_block('dynamic2_child1b', func=passthrough)
        self.pipeline.add_block(dynamic2_child1b, upstream_block_uuids=[dynamic2.uuid])

        dynamic2_child2b = self.create_block('dynamic2_child2b', func=passthrough)
        self.pipeline.add_block(dynamic2_child2b, upstream_block_uuids=[dynamic2.uuid])

        # Dynamic duo
        dynamic1_child1a_dynamic = self.create_block('dynamic1_child1a_dynamic', func=passthrough)
        self.pipeline.add_block(
            dynamic1_child1a_dynamic, upstream_block_uuids=[dynamic1_child1a.uuid, dynamic1.uuid]
        )

        dynamic2_child1b_dynamic = self.create_block('dynamic2_child1b_dynamic', func=passthrough)
        self.pipeline.add_block(
            dynamic2_child1b_dynamic, upstream_block_uuids=[dynamic2_child1b.uuid, dynamic2.uuid]
        )

        # Reduce outputs
        # # Reduce output from dynamic1 children
        dynamic1_child1a_reduce1a = self.create_block(
            'dynamic1_child1a_reduce1a',
            func=passthrough,
            configuration=dict(dynamic=dict(reduce_output=True)),
        )
        self.pipeline.add_block(
            dynamic1_child1a_reduce1a, upstream_block_uuids=[dynamic1_child1a.uuid]
        )

        dynamic1_child1a_child2a_reduce2a = self.create_block(
            'dynamic1_child1a_child2a_reduce2a',
            func=passthrough,
            configuration=dict(dynamic=dict(reduce_output=True)),
        )
        self.pipeline.add_block(
            dynamic1_child1a_child2a_reduce2a,
            upstream_block_uuids=[dynamic1_child1a.uuid, dynamic1_child2a.uuid],
        )
        # Reduce output from dynamic2 children
        dynamic2_child1b_reduce1b = self.create_block(
            'dynamic2_child1b_reduce1b',
            func=passthrough,
            configuration=dict(dynamic=dict(reduce_output=True)),
        )
        self.pipeline.add_block(
            dynamic2_child1b_reduce1b, upstream_block_uuids=[dynamic2_child1b.uuid]
        )

        dynamic2_child1b_child2b_reduce2b = self.create_block(
            'dynamic2_child1b_child2b_reduce2b',
            func=passthrough,
            configuration=dict(dynamic=dict(reduce_output=True)),
        )
        self.pipeline.add_block(
            dynamic2_child1b_child2b_reduce2b,
            upstream_block_uuids=[dynamic2_child1b.uuid, dynamic2_child2b.uuid],
        )

        # Final blocks
        end1 = self.create_block('end1', func=passthrough)
        self.pipeline.add_block(end1, upstream_block_uuids=[dynamic1_child1a_reduce1a.uuid])

        end2 = self.create_block('end2', func=passthrough)
        self.pipeline.add_block(
            end2,
            upstream_block_uuids=[
                dynamic1_child1a_reduce1a.uuid,
                dynamic1_child1a_child2a_reduce2a.uuid,
            ],
        )

        end3 = self.create_block('end3', func=passthrough)
        self.pipeline.add_block(end3, upstream_block_uuids=[block2.uuid])

        end4 = self.create_block('end4', func=passthrough)
        self.pipeline.add_block(end4, upstream_block_uuids=[block1.uuid, block2.uuid])

        pipeline_run = create_pipeline_run(pipeline_uuid=self.pipeline.uuid)

        def get_run(block, block_runs=pipeline_run.block_runs):
            return next(br for br in block_runs if br.block_uuid == block.uuid)

        def complete(blocks):
            updates(blocks, BlockRun.BlockRunStatus.COMPLETED)

        def running(blocks):
            updates(blocks, BlockRun.BlockRunStatus.RUNNING)

        def updates(blocks, status):
            for block in blocks:
                get_run(block).update(status=status)

        def test_status(blocks, status=BlockRun.BlockRunStatus.COMPLETED):
            for block in blocks:
                self.assertEqual(get_run(block).status, status)

        def test_runs(blocks, cls=self, pipeline_run=pipeline_run):
            cls.assertEqual(
                [br.block_uuid for br in pipeline_run.executable_block_runs()],
                [b.uuid for b in blocks],
            )

        test_runs([block1, block2, dynamic1])

        complete([block2])
        running([dynamic1])

        # If a block run is running,
        # it’s no longer considered an executable block run to be scheduled.
        test_runs([block1, dynamic2, dynamic1_child1a, end3])

        complete([block1])
        test_runs([dynamic2, dynamic1_child1a, dynamic1_child2a, end3, end4])

        running([dynamic2, end3, end4])
        test_runs([dynamic1_child1a, dynamic1_child2a, dynamic2_child1b, dynamic2_child2b])

        running([dynamic1_child1a])
        test_runs([
            dynamic1_child2a,
            dynamic2_child1b,
            dynamic2_child2b,
            dynamic1_child1a_dynamic,
            dynamic1_child1a_reduce1a,
        ])

        running([dynamic1_child2a])
        test_runs([
            dynamic2_child1b,
            dynamic2_child2b,
            dynamic1_child1a_dynamic,
            dynamic1_child1a_reduce1a,
            dynamic1_child1a_child2a_reduce2a,
        ])

        running([dynamic1_child1a_reduce1a])
        test_runs([
            dynamic2_child1b,
            dynamic2_child2b,
            dynamic1_child1a_dynamic,
            dynamic1_child1a_child2a_reduce2a,
        ])

        complete([dynamic1_child1a_reduce1a])
        test_runs([
            dynamic2_child1b,
            dynamic2_child2b,
            dynamic1_child1a_dynamic,
            dynamic1_child1a_child2a_reduce2a,
            end1,
        ])

        running([dynamic1_child1a_child2a_reduce2a])
        test_runs([
            dynamic2_child1b,
            dynamic2_child2b,
            dynamic1_child1a_dynamic,
            end1,
        ])

        complete([dynamic1_child1a_child2a_reduce2a])
        test_runs([
            dynamic2_child1b,
            dynamic2_child2b,
            dynamic1_child1a_dynamic,
            end1,
            end2,
        ])

        complete([
            dynamic2_child1b,
            dynamic2_child2b,
            dynamic1_child1a_dynamic,
            end1,
            end2,
        ])
        test_runs([
            dynamic2_child1b_dynamic,
            dynamic2_child1b_reduce1b,
            dynamic2_child1b_child2b_reduce2b,
        ])

        running([
            dynamic2_child1b_dynamic,
            dynamic2_child1b_reduce1b,
            dynamic2_child1b_child2b_reduce2b,
        ])

        self.assertEqual(len(pipeline_run.executable_block_runs()), 0)

        self.assertEqual(len(self.pipeline.blocks_by_uuid), len(pipeline_run.block_runs))
        self.assertEqual(len(self.pipeline.blocks_by_uuid), 18)
