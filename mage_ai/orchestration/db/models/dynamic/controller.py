from mage_ai.data_preparation.models.block.dynamic.models import DynamicRun
from mage_ai.data_preparation.models.block.dynamic.shared import (
    is_dynamic_block,
    is_dynamic_block_child,
    should_reduce_output,
)


def is_ready_to_process_data(pipeline, block_run, block_runs) -> bool:
    """
    Runs are “ready” can begin running when all their upstream blocks meet 1 of these conditions:
        1. Condition set 1
            - dynamic block or dynamic child
            - not reduce_output
            - status is running or all their upstream blocks are completed
        2. Condition set 2
            - not (dynamic block or dynamic child) or reduce_output
            - block.all_upstream_blocks_completed(completed_block_uuids)
    """
    block = pipeline.get_block(block_run.block_uuid)
    if not block:
        raise Exception(f'Block {block_run.block_uuid} not found in pipeline {pipeline.uuid}')

    if not block.upstream_blocks:
        return True

    mapping = {}
    for br in block_runs:
        block_inner = pipeline.get_block(br.block_uuid)
        if block_inner.uuid not in mapping:
            mapping[block_inner.uuid] = DynamicRun.load(block=block_inner)

        run = mapping[block_inner.uuid]
        run.add(br)

    def __condition_1(upstream_block, mapping=mapping) -> bool:
        run = mapping.get(upstream_block.uuid)
        if not run:
            return False

        return (
            (
                is_dynamic_block(upstream_block)
                or is_dynamic_block_child(upstream_block, include_reduce_output=True)
            )
            and not should_reduce_output(upstream_block)
            and (
                run.block_run.status
                in [run.block_run.BlockRunStatus.COMPLETED, run.block_run.BlockRunStatus.RUNNING]
            )
        )

    def __condition_2(upstream_block, mapping=mapping) -> bool:
        run = mapping.get(upstream_block.uuid)
        if not run:
            return False

        return (
            should_reduce_output(upstream_block)
            or not (
                is_dynamic_block(upstream_block)
                or is_dynamic_block_child(upstream_block, include_reduce_output=True)
            )
        ) and (run.block_run.status in [run.block_run.BlockRunStatus.COMPLETED])

    results = [
        (upstream_block.uuid, __condition_1(upstream_block), __condition_2(upstream_block))
        for upstream_block in block.upstream_blocks
    ]
    ready = all([t[1] or t[2] for t in results])

    return ready
