from typing import List

from mage_ai.shared.array import find


def all_upstreams_completed(block, block_runs: List) -> bool:
    pipeline = block.pipeline

    block_runs_for_current_block = filter(
        lambda br: block.uuid == pipeline.get_block(br.block_uuid),
        block_runs,
    )

    upstream_block_uuids_mapping = {}
    for br in block_runs_for_current_block:
        # If this dynamic child block has upstream blocks that were dynamically created:
        if br.metrics and br.metrics.get('dynamic_upstream_block_uuids'):
            for up_uuid in br.metrics.get('dynamic_upstream_block_uuids') or []:
                up_block = pipeline.get_block(up_uuid)
                if up_block and up_block.uuid not in upstream_block_uuids_mapping:
                    upstream_block_uuids_mapping[up_block.uuid] = []
                # Create a mapping of the original upstream block
                # to all of its dynamic child block’s block run’s block_uuid
                upstream_block_uuids_mapping[up_block.uuid].append(up_uuid)

    completed_checks = []
    # Check that all the upstream block for this block is completed.
    for upstream_block in block.upstream_blocks:
        # If the upstream block’s UUID is in the mapping, that means it had an upstream block
        # that was a dynamic child block; and it’s upstream was dynamically created.
        if upstream_block.uuid in upstream_block_uuids_mapping:
            br_uuids = upstream_block_uuids_mapping[upstream_block.uuid]
            for br_uuid in br_uuids:
                up_block_run = find(lambda br: br.block_uuid == br_uuid, block_runs)

                if up_block_run:
                    completed = 'completed' == up_block_run.status
                    completed_checks.append(completed)
                    if not completed:
                        return False
                else:
                    # If there is no block run, then it never completed.
                    completed_checks.append(False)
                    return False
        elif upstream_block.upstream_blocks:
            # If the upstream block has other upstream blocks that don’t have
            # dynamically created upstream blocks:
            for up_upstream_block in upstream_block.upstream_blocks:
                completed = all_upstreams_completed(
                    up_upstream_block,
                    block_runs,
                )
                completed_checks.append(completed)
                if not completed:
                    return False
        else:
            # If the upstream block has no upstream blocks,
            # check to see if its single block run is completed.
            up_block_run = find(lambda br: br.block_uuid == upstream_block.uuid, block_runs)

            if up_block_run:
                completed = 'completed' == up_block_run.status
                completed_checks.append(completed)
                if not completed:
                    return False
            else:
                # If there is no block run, then it never completed.
                completed_checks.append(False)
                return False

    return all(completed_checks)


# def create_block_runs_from_dynamic_child_block(
#     block,
#     pipeline_run,
#     block_run,
# ):
#     block_uuid_original = block.uuid
#     block_run_block_uuid = block_run.block_uuid

#     block_metadata = block_run.metrics
#     upstream_blocks = block.upstream_blocks
#     upstream_blocks_that_are_dynamic = [b.uuid for b in upstream_blocks if is_dynamic_block(b)]

#     index = block_metadata.get('dynamic_block_index')

#     runs = []
#     down_uuids = []
#     should_update_status = True

#     for downstream_block in block.downstream_blocks:
#         # This is created from another function.
#         if downstream_block.uuid in upstream_blocks_that_are_dynamic:
#             continue

#         arr = [
#             block_run_block_uuid,
#         ]

#         upstream_dynamic_child_blocks = []

#         for upstream_block in downstream_block.upstream_blocks:
#             if block_uuid_original == upstream_block.uuid:
#                 continue
#             elif is_dynamic_block_child(upstream_block):
#                 upstream_dynamic_child_blocks.append(upstream_block)

#         if len(upstream_dynamic_child_blocks) >= 1:
#             for upstream_block in upstream_dynamic_child_blocks:
#                 from mage_ai.orchestration.db.models.schedules import BlockRun

#                 block_runs = BlockRun.query.filter(
#                     BlockRun.pipeline_run_id == pipeline_run.id,
#                 )

#                 count = 0
#                 print('OMGGGGGGGGGGGGGGGGGGGGGGGGGG', pipeline_run.id)
#                 for wtf in sorted([br.block_uuid for br in block_runs]):
#                     print(f'\t{wtf}')
#                     count += 1
#                 print('OMGGGGGGGGGGGGGGGGGGGGGGGGGG', count)

#                 if all_upstreams_completed(upstream_block, block_runs):
#                     def __select(
#                         br,
#                         block=block,
#                         upstream_block=upstream_block,
#                     ) -> bool:
#                         block2 = block.pipeline.get_block(br.block_uuid)
#                         print('WTFFFFFFFFFFFFFFFF------------------------------------------',
#                             br.block_uuid,
#                             upstream_block.uuid,
#                             block2,
#                             block2.uuid
#                             )

#                         return upstream_block.uuid == block2.uuid

#                     up_block_runs = list(filter(
#                         __select,
#                         block_runs,
#                     ))
#                     print('WTFFFFFFFFFFFFFFFFFFFFFFFFFFFF', upstream_block.uuid, up_block_runs)

#                     for up_block_run in up_block_runs:
#                         print('WTFFFFFFFFFFFFFFFFFFFFFFFFFFFF', upstream_block.uuid, up_block_run.
# block_uuid)
#                         br = create_block_run_from_dynamic_child(
#                             downstream_block,
#                             pipeline_run,
#                             block_metadata=dict(
#                                 dynamic_upstream_block_uuids=arr + [
#                                     up_block_run.block_uuid,
#                                 ],
#                             ),
#                             index=index,
#                             indexes=[
#                                 index,
#                                 (up_block_run.metrics or {}).get('index'),
#                             ],
#                             upstream_block_uuid=block_run_block_uuid,
#                             upstream_block_uuids=[
#                                 block_run_block_uuid,
#                                 up_block_run.block_uuid,
#                             ],
#                         )
#                         runs.append(br)
#                         down_uuids.append(downstream_block.uuid)

#                 else:
#                     should_update_status = False
#         else:
#             br = create_block_run_from_dynamic_child(
#                 downstream_block,
#                 pipeline_run,
#                 block_metadata=dict(dynamic_upstream_block_uuids=arr),
#                 index=index,
#                 upstream_block_uuid=block_run_block_uuid,
#             )
#             runs.append(br)
#             down_uuids.append(downstream_block.uuid)

#     return runs, down_uuids, should_update_status
