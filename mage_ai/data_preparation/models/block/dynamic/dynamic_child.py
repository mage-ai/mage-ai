from typing import Dict, List, Tuple

import pandas as pd

from mage_ai.data_preparation.models.block.utils import (
    dynamic_block_uuid,
    dynamic_block_values_and_metadata,
    is_dynamic_block,
)
from mage_ai.data_preparation.models.constants import BlockType


class DynamicChildBlockFactory:
    def __init__(
        self,
        block,
        block_run=None,
        block_run_id: int = None,
        pipeline_run=None,
        **kwargs,
    ):
        self.block = block
        self.block_run = block_run
        self.block_run_id = block_run_id
        self.pipeline_run = pipeline_run
        self.type = BlockType.DYNAMIC_CHILD

    def __getattr__(self, name):
        val = getattr(self.block, name)

        def _missing(val=val, *args, **kwargs):
            return val(*args, **kwargs)

        if callable(val):
            return _missing

        return val

    def execute_sync(
        self,
        execution_partition: str = None,
        **kwargs,
    ) -> List[Dict]:
        return [dict(
            block_uuid=block_uuid,
            metadata=metrics,
        ) for _block_run, block_uuid, metrics in self.create_block_runs(execution_partition)]

    def create_block_runs(self, execution_partition: str = None) -> List[Tuple]:
        blocks = []
        for block in self.block.upstream_blocks:
            if is_dynamic_block(block):
                blocks.append(block)

        outputs = []
        for block in blocks:
            values, block_metadata = dynamic_block_values_and_metadata(
                block,
                execution_partition,
                block.uuid,
            )
            if isinstance(values, pd.DataFrame):
                values = values.to_dict(orient='records')
            outputs.append((values, block_metadata))

        all_data = None
        for idx_outer, output in enumerate(outputs):
            upstream_block = blocks[idx_outer]

            child_data = None
            child_metadata = None

            if len(output) >= 1:
                child_data = output[0]

            if len(output) >= 2:
                child_metadata = output[1]

            metadata_len = len(child_metadata) if child_metadata else 0

            if all_data is None:
                all_data = []
                if child_data:
                    for idx, data in enumerate(child_data):
                        metadata = None
                        if idx < metadata_len:
                            metadata = child_metadata[idx]
                        all_data.append([(upstream_block.uuid, idx, data, metadata)])
                else:
                    all_data.append([(None, None, None)])
            else:
                arr = []
                for data_arr in all_data:
                    if child_data:
                        for idx, data in enumerate(child_data):
                            metadata = None
                            if idx < metadata_len:
                                metadata = child_metadata[idx]
                            arr.append(data_arr + [(upstream_block.uuid, idx, data, metadata)])
                    else:
                        arr.append(data_arr + [(None, None, None)])

                all_data = arr

        block_runs_tuples = []
        for idx, tup in enumerate(all_data):
            block_runs_tuples.append(self.create_block_run(idx, tup))

        return block_runs_tuples

    def create_block_run(self, index: int, child_data_list: List[Tuple]) -> Tuple:
        metadata = {}
        dynamic_block_indexes = {}
        block_uuids = []

        for tup in child_data_list:
            parent_block_uuid, parent_index, output_data, metadata = tup

            block_uuid_metadata = str(parent_index)
            if metadata:
                metadata[parent_block_uuid] = metadata
                if metadata.get('block_uuid'):
                    block_uuid_metadata = metadata['block_uuid']
            block_uuids.append(block_uuid_metadata)

            dynamic_block_indexes[parent_block_uuid] = parent_index

        metadata_for_uuid = {}
        if any([uuid is not None for uuid in block_uuids]):
            metadata_for_uuid['block_uuid'] = '__'.join(
                [uuid or str(idx) for idx, uuid in enumerate(block_uuids)],
            )

        block_uuid = dynamic_block_uuid(
            self.block.uuid,
            metadata_for_uuid,
            index=index,
            # upstream_block_uuid=upstream_block_uuid,
        )
        metrics = dict(
            dynamic_block_index=index,
            dynamic_block_indexes=dynamic_block_indexes,
            metadata=metadata,
        )
        block_run = self.pipeline_run.create_block_run(
            block_uuid,
            metrics=metrics,
            skip_if_exists=True,
        )

        return block_run, block_uuid, metrics
