import time
from typing import Dict, List, Optional

from mage_ai.data_preparation.models.block.dynamic.counter import (
    DynamicBlockItemCounter,
    DynamicChildItemCounter,
    DynamicDuoItemCounter,
    DynamicItemCounter,
)
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
        completed_block_runs = len([
            block_run
            for block_run in self.__fetch_cloned_block_runs().values()
            if block_run.status == BlockRun.BlockRunStatus.COMPLETED
        ])
        item_count_total = self.calculate_item_count()

        upstream_block_runs = self.__upstream_block_runs()
        upstream_block_runs_completed = len([
            block_run.status == BlockRun.BlockRunStatus.COMPLETED
            for block_run in upstream_block_runs
        ])

        completed = (
            upstream_block_runs_completed >= len(upstream_block_runs)
            and completed_block_runs >= item_count_total
        )

        if not completed:
            if self.block_run is not None:
                message = (
                    f'Dynamic block factory for {self.block.uuid} '
                    f'(block run ID {self.block_run_id}) is still working: '
                    f'{completed_block_runs}/{item_count_total} '
                    'dynamic child blocks completed.'
                )
                if self.logger:
                    self.logger.info(message)
                else:
                    print(message)
            self.__sleep()

        return completed

    def __fetch_cloned_block_runs(self) -> Dict[str, BlockRun]:
        cloned_block_runs = {}
        for block_run in self.block_runs():
            block = self.pipeline.get_block(block_run.block_uuid)
            if block and block.uuid == self.block.uuid:
                block_run_previous = cloned_block_runs.get(block_run.block_uuid)
                if (
                    block_run_previous is None
                    or block_run.started_at > block_run_previous.started_at
                ):
                    cloned_block_runs[block_run.block_uuid] = block_run
        return cloned_block_runs

    def calculate_item_count(self) -> int:
        return sum([counter.item_count() for counter in self.counters.values()])

    @property
    def counters(self) -> Dict[str, DynamicItemCounter]:
        if self._counters is None:
            self._counters = {}
            for upstream_block in self.block.upstream_blocks:
                counter_class = None
                is_dynamic_parent = upstream_block.should_dynamically_generate_block(self.block)
                if upstream_block.is_dynamic_child:
                    if is_dynamic_parent:
                        counter_class = DynamicDuoItemCounter
                    else:
                        counter_class = DynamicChildItemCounter
                else:
                    counter_class = DynamicBlockItemCounter

                if counter_class is not None:
                    self._counters[upstream_block.uuid] = counter_class(
                        upstream_block,
                        partition=self.execution_partition,
                    )

        return self._counters

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
        poll_interval = (
            mode_settings.poll_interval if mode_settings else DEFAULT_STREAM_POLL_INTERVAL
        ) or DEFAULT_STREAM_POLL_INTERVAL
        time.sleep(poll_interval)

    def execute_sync(
        self,
        execution_partition: Optional[str] = None,
        logging_tags: Optional[Dict] = None,
        **kwargs,
    ) -> List[Dict]:
        cloned_block_runs = self.__fetch_cloned_block_runs()
        item_count = self.calculate_item_count()
        diff = item_count - len(cloned_block_runs)
        if diff <= 0:
            return []

        block_runs = []
        pipeline_run = self.pipeline_run()

        for i in range(diff):
            dynamic_block_index = len(cloned_block_runs) + i
            block_run_uuid = ':'.join([self.block.uuid, str(dynamic_block_index)])
            block_run = pipeline_run.create_block_run(
                block_run_uuid,
                metrics=dict(dynamic_block_index=dynamic_block_index),
                skip_if_exists=True,
            )
            block_runs.append(block_run)

        return block_runs
