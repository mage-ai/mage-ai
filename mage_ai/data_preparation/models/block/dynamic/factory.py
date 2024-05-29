import time
from functools import reduce
from typing import Dict, List, Optional

from mage_ai.data_preparation.models.block.dynamic.counter import DynamicItemCounter
from mage_ai.data_preparation.models.block.dynamic.wrappers import (
    DynamicBlockWrapperBase,
)
from mage_ai.data_preparation.models.block.settings.dynamic.constants import (
    DEFAULT_STREAM_POLL_INTERVAL,
    ModeType,
)
from mage_ai.orchestration.db.models.schedules import BlockRun


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

        return block_runs

    @property
    def __counters(self) -> Dict[str, DynamicItemCounter]:
        if self._counters is None:
            self._counters = {}
            for upstream_block in self.block.upstream_blocks:
                counter = DynamicItemCounter.build_counter(
                    upstream_block,
                    downstream_block=self.block,
                    partition=self.execution_partition,
                )
                if counter is not None:
                    self._counters[upstream_block.uuid] = counter

        return self._counters

    def __calculate_item_count(self) -> int:
        return reduce(
            lambda a, b: a * b,
            # Multiply by 0 so that no block runs are created until all
            # upstream blocks have at least 1 output.
            [
                counter.item_count() if counter is not None else 1
                for counter in self.__counters.values()
            ],
            1,
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
