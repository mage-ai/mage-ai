import time
from functools import reduce
from typing import Callable, Dict, List, Optional

from mage_ai.data_preparation.models.block.dynamic.counter import DynamicItemCounter
from mage_ai.data_preparation.models.block.dynamic.utils import (
    is_dynamic_block_child,
    should_reduce_output,
)
from mage_ai.data_preparation.models.block.dynamic.wrappers import (
    DynamicBlockWrapperBase,
)
from mage_ai.data_preparation.models.block.settings.dynamic.constants import (
    DEFAULT_STREAM_POLL_INTERVAL,
    ModeType,
)
from mage_ai.orchestration.db.models.schedules import BlockRun
from mage_ai.shared.array import find


def build_counters(block, execution_partition: Optional[str] = None):
    counters = {}

    for upstream_block in block.upstream_blocks:
        counter = DynamicItemCounter.build_counter(
            upstream_block,
            downstream_block=block,
            partition=execution_partition,
        )
        if counter is not None:
            counters[upstream_block.uuid] = counter

    return counters


def calculate_item_count(
    block,
    execution_partition: Optional[str] = None,
    check_upstream_block_uuids_only: Optional[List[str]] = None,
    update_upstream_item_count_callback: Optional[Callable] = None,
) -> int:
    counters = build_counters(block, execution_partition)

    uuid_counts = [
        (
            uuid,
            counter.item_count() if counter is not None else 1,
        )
        for uuid, counter in counters.items()
    ]

    def __multiply(acc, pair):
        uuid, count = pair

        if (
            count == 0
            and check_upstream_block_uuids_only
            and uuid in check_upstream_block_uuids_only
        ):
            # Check to see how many items were suppose to be created by the upstream block.
            upstream_block = find(lambda b: b.uuid == uuid, block.upstream_blocks or [])
            item_count = calculate_item_count(
                upstream_block,
                execution_partition,
                check_upstream_block_uuids_only=check_upstream_block_uuids_only,
            )

            if update_upstream_item_count_callback:
                count = update_upstream_item_count_callback(uuid, count, item_count)

        return acc * count

    return reduce(
        __multiply,
        # Multiply by 0 so that no block runs are created until all
        # upstream blocks have at least 1 output.
        uuid_counts,
        1,
    )


class DynamicBlockFactory(DynamicBlockWrapperBase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._counters = None
        self._item_count = None

    def is_complete(self) -> bool:
        upstream_blocks_count = len(self.block.upstream_blocks)

        completed_block_runs = len([
            block_run
            for block_run in self.__fetch_cloned_block_runs().values()
            if block_run.status == BlockRun.BlockRunStatus.COMPLETED
        ])

        # If item count is 0 because the upstream blocks haven’t output anything yet
        item_count_total = max(self.__calculate_item_count(), upstream_blocks_count)

        upstream_block_runs = self.__upstream_block_runs()
        upstream_block_runs_completed = len([
            block_run
            for block_run in upstream_block_runs
            if block_run.status == BlockRun.BlockRunStatus.COMPLETED
        ])

        completed = (
            upstream_block_runs_completed >= upstream_blocks_count
            and completed_block_runs >= item_count_total
        )

        if not completed:
            if self.block_run is not None:
                upstream_block_uuids = ', '.join([b.uuid for b in self.block.upstream_blocks])
                message = (
                    f'Dynamic block factory for {self.block.uuid} '
                    f'(block run ID {self.block_run_id}) is still working: '
                    f'{completed_block_runs} of at least {item_count_total} '
                    'dynamic child blocks completed. '
                    f'Upstream blocks: {upstream_block_runs_completed} completed of '
                    f'{len(upstream_block_runs)} block runs ({upstream_block_uuids})'
                )
                if self.logger:
                    self.logger.info(message)
                else:
                    print(message)
            self.__sleep()

        return completed

    def execute_sync(
        self,
        execution_partition: Optional[str] = None,
        logging_tags: Optional[Dict] = None,
        **kwargs,
    ) -> List[Dict]:
        cloned_block_runs = self.__fetch_cloned_block_runs()
        runs_count = len(cloned_block_runs)
        item_count = self.__calculate_item_count()

        counts = ', '.join([
            f'{block_uuid}={counter.item_count() if counter is not None else 1}'
            for block_uuid, counter in self.__counters.items()
        ])
        print(
            f'[DynamicBlockFactory.item_count] {self.block_run().block_uuid}: {item_count} '
            f'items ({counts})'
        )

        block_runs = []
        pipeline_run = self.pipeline_run()

        for dynamic_block_index in range(runs_count, item_count):
            block_run_uuid = ':'.join([self.block.uuid, str(dynamic_block_index)])
            block_run = pipeline_run.create_block_run(
                block_run_uuid,
                metrics=dict(dynamic_block_index=dynamic_block_index),
                skip_if_exists=True,
            )
            block_runs.append(block_run)

        print(
            f'[DynamicBlockFactory.execute_sync] {self.block_run().block_uuid}: '
            f'creating {len(block_runs)} block runs; '
            f'{", ".join([str(br.block_uuid) + ":" + str(br.id) for br in block_runs])}'
        )

        return block_runs

    @property
    def __counters(self) -> Dict[str, DynamicItemCounter]:
        if self._counters is None:
            self._counters = build_counters(self.block, self.execution_partition)
        return self._counters

    def __calculate_item_count(self) -> int:
        # If an upstream block indeed has no output (e.g. no return statement),
        # we need to ensure that the downstream block is still executed.

        def __update_upstream_item_count(
            upstream_uuid: str, output_item_count: int, spawn_count: int
        ):
            print(
                f'[DynamicBlockFactory.__calculate_item_count] {self.block_run().block_uuid}: '
                f'Upstream block {upstream_uuid} '
                f'item count: {output_item_count}, spawn count: {spawn_count}'
            )
            # If the upstream block was spawned more than once, we need to check and see how many
            # of them are done running.
            # If all are done running and the item count that it returns is still 0,
            # we need to return 1 so that the downstream block is still executed.
            if spawn_count > 0:
                block_runs = self.block_runs()
                upstream_block_runs_completed = []
                for block_run in block_runs:
                    if block_run.status != BlockRun.BlockRunStatus.COMPLETED:
                        continue

                    block = self.pipeline.get_block(block_run.block_uuid)
                    if block and block.uuid == upstream_uuid:
                        dynamic_child = is_dynamic_block_child(block)
                        reduce_output = should_reduce_output(block)

                        # Only count the block run with the original block UUID if:
                        # 1. It’s not a dynamic child block, or
                        # 2. It reduces its output
                        if (
                            block.uuid == block_run.block_uuid
                            and dynamic_child
                            and not reduce_output
                        ):
                            continue

                        upstream_block_runs_completed.append(block_run)

                completed_count = len(upstream_block_runs_completed)

                print(
                    f'[DynamicBlockFactory.__calculate_item_count] {self.block_run().block_uuid}: '
                    f'Upstream block {upstream_uuid} '
                    f'item count: {output_item_count}, '
                    f'completed block runs: {completed_count}, '
                    f'all block runs: {len(block_runs)}'
                )

                if completed_count == spawn_count:
                    return 1

            # If no upstream block has been spawned,
            # we need to return 1 so that the downstream block is still executed.
            if spawn_count == 0:
                return 1

            return output_item_count

        return calculate_item_count(
            self.block,
            self.execution_partition,
            check_upstream_block_uuids_only=list(self.__counters.keys() or []),
            update_upstream_item_count_callback=__update_upstream_item_count,
        )

    def __fetch_cloned_block_runs(self) -> Dict[str, BlockRun]:
        cloned_block_runs = {}
        for block_run in self.block_runs():
            if block_run.block_uuid == self.block.uuid or (
                self.block.uuid_replicated is not None
                and block_run.block_uuid == self.block.uuid_replicated
            ):
                continue

            block = self.pipeline.get_block(block_run.block_uuid)
            if block and block.uuid == self.block.uuid:
                block_run_previous = cloned_block_runs.get(block_run.block_uuid)
                if (
                    block_run_previous is None
                    or block_run.started_at > block_run_previous.started_at
                ):
                    cloned_block_runs[block_run.block_uuid] = block_run
        return cloned_block_runs

    def __upstream_block_runs(self) -> List[BlockRun]:
        upstream_block_uuids = [
            upstream_block.uuid_replicated
            if upstream_block.replicated_block
            else upstream_block.uuid
            for upstream_block in self.block.upstream_blocks
        ]
        return [
            block_run
            for block_run in self.block_runs()
            if block_run.block_uuid in upstream_block_uuids
        ]

    def __sleep(self) -> None:
        mode_settings = self.block.settings_for_mode(ModeType.STREAM)
        poll_interval = mode_settings.poll_interval if mode_settings is not None else None
        poll_interval = (
            poll_interval if poll_interval is not None else DEFAULT_STREAM_POLL_INTERVAL
        )
        time.sleep(poll_interval)
