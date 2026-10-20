import time
from typing import Dict, List, Optional

import pandas as pd

from mage_ai.data_preparation.models.block.dynamic.utils import (
    build_combinations_for_dynamic_child,
    is_dynamic_block,
    is_dynamic_block_child,
)
from mage_ai.data_preparation.models.block.dynamic.variables import (
    get_outputs_for_dynamic_block,
    get_outputs_for_dynamic_child,
)
from mage_ai.data_preparation.models.block.dynamic.wrappers import (
    DynamicBlockWrapperBase,
)


class DynamicChildController(DynamicBlockWrapperBase):
    def execute_sync(
        self,
        execution_partition: Optional[str] = None,
        logging_tags: Optional[Dict] = None,
        **kwargs,
    ) -> List[Dict]:
        pipeline = self.block.pipeline
        upstream_blocks = self.block.upstream_blocks

        block_runs_by_block_uuid = {}
        for block_run in self.block_runs():
            block = pipeline.get_block(block_run.block_uuid)
            if block.uuid not in block_runs_by_block_uuid:
                block_runs_by_block_uuid[block.uuid] = []
            block_runs_by_block_uuid[block.uuid].append(block_run)

        counts_by_upstream_block_uuid = {}
        metadata_by_upstream_block_uuid = {}
        for upstream_block in upstream_blocks:
            is_dynamic_child = is_dynamic_block_child(upstream_block)
            is_dynamic = is_dynamic_block(upstream_block)

            if is_dynamic_child:
                # [(['0_a', '1_a'],), (['2_b', '3_b'],), (['4_c', '5_c'],)]

                tries = 0
                count = 0
                while tries < 12 and count == 0:
                    # If this block tries to get the data too soon, it’ll return empty.
                    lazy_variable_controller = get_outputs_for_dynamic_child(
                        upstream_block,
                        execution_partition=execution_partition,
                        logging_tags=logging_tags,
                    )

                    if lazy_variable_controller is not None:
                        count = len(lazy_variable_controller)

                    if count == 0:
                        time.sleep(10)
                        tries += 1

                counts_by_upstream_block_uuid[upstream_block.uuid] = count

                if is_dynamic:
                    metadata_by_upstream_block_uuid[upstream_block.uuid] = [
                        lazy_var_set.read_metadata() for lazy_var_set in lazy_variable_controller
                    ]
            elif is_dynamic:
                tries = 0
                count = 0
                while tries < 12 and count == 0:
                    # If this block tries to get the data too soon, it’ll return empty.
                    values, metadata = get_outputs_for_dynamic_block(
                        upstream_block,
                        execution_partition=execution_partition,
                    )
                    if values is not None:
                        if isinstance(values, pd.DataFrame):
                            count = len(values.index)
                        else:
                            count = len(values)

                    if count == 0:
                        time.sleep(10)
                        tries += 1

                counts_by_upstream_block_uuid[upstream_block.uuid] = count
                metadata_by_upstream_block_uuid[upstream_block.uuid] = metadata

        tries = 0
        combos = None
        while tries < 12 and combos is None:
            try:
                combos = build_combinations_for_dynamic_child(
                    self.block,
                    execution_partition=execution_partition,
                )
            except Exception:
                time.sleep(10)
                tries += 1

        if combos is None:
            return []

        block_run_dicts = []

        for combo in combos:
            dynamic_block_index = combo.get('dynamic_block_index')

            block_run_block_uuid = dynamic_block_index
            dynamic_upstream_block_uuids = []
            upstream_blocks_from_metadata = []

            for upstream_block in upstream_blocks:
                is_dynamic_child = is_dynamic_block_child(upstream_block)
                is_dynamic = is_dynamic_block(upstream_block)

                if is_dynamic_child or is_dynamic:
                    count = counts_by_upstream_block_uuid.get(upstream_block.uuid)

                    if count is not None and count >= 1:
                        parent_index = dynamic_block_index % count

                        if is_dynamic_child:
                            block_runs = block_runs_by_block_uuid[upstream_block.uuid]
                            block_runs = sorted(
                                [br for br in block_runs if br.block_uuid != upstream_block.uuid],
                                key=lambda br: br.id,
                            )
                            # This errors list index out of range
                            if parent_index < len(block_runs):
                                dynamic_upstream_block_uuids.append(
                                    block_runs[parent_index].block_uuid
                                )

                        if metadata_by_upstream_block_uuid.get(upstream_block.uuid):
                            metadata = metadata_by_upstream_block_uuid[upstream_block.uuid]
                            if parent_index < len(metadata):
                                metadata = metadata[parent_index]

                                if metadata.get('block_uuid'):
                                    block_run_block_uuid = metadata.get('block_uuid')

                                if metadata.get('upstream_blocks'):
                                    upstream_blocks_from_metadata.extend(
                                        metadata.get('upstream_blocks'),
                                    )

            block_run_dict = dict(
                dynamic_block_index=dynamic_block_index,
                dynamic_upstream_block_uuids=dynamic_upstream_block_uuids,
            )

            if upstream_blocks_from_metadata:
                block_run_dict['upstream_blocks'] = upstream_blocks_from_metadata

            block_run_dicts.append((
                f'{self.block.uuid}:{block_run_block_uuid}',
                block_run_dict,
            ))

        block_runs = []
        pipeline_run = self.pipeline_run()
        for block_uuid, block_run_dict in block_run_dicts:
            block_run = pipeline_run.create_block_run(
                block_uuid,
                metrics=block_run_dict,
                skip_if_exists=True,
            )
            block_runs.append(block_run)

        return block_runs
