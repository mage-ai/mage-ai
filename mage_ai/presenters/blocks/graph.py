import math
from typing import Dict, List

from mage_ai.data_preparation.models.block.constants import (
    TAG_DYNAMIC,
    TAG_DYNAMIC_CHILD,
    TAG_REDUCE_OUTPUT,
    TAG_REPLICA,
)
from mage_ai.data_preparation.models.block.dynamic.utils import (
    is_dynamic_block,
    is_dynamic_block_child,
    should_reduce_output,
)
from mage_ai.data_preparation.models.constants import BlockType, PipelineType
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.orchestration.db.models.schedules import BlockRun, PipelineRun
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict

MAX_BLOCKS_FOR_TREE = 100


def build_dynamic_blocks_for_block_runs(pipeline: Pipeline, block_runs: List[BlockRun]) -> Dict:
    """
    1. Loop through all blocks using pipeline blocks
    2. For the current block, construct its upstream and downstream blocks
    3. Continue until done
    4. Remove the original blocks if:
        - The block is a child block and
            has more than 1 dynamic upstream that doesn’t reduce output

    1. Show valid graph when insufficient number of blocks are running.
    2. Group blocks together if beyond max amount.
    """

    block_dicts_by_uuid = {}

    block_runs_by_block_uuid = {}
    for block_run in block_runs:
        block = pipeline.get_block(block_run.block_uuid)
        if block.uuid not in block_runs_by_block_uuid:
            block_runs_by_block_uuid[block.uuid] = dict(
                clones=[],
                original=None,
            )

        if block_run.block_uuid == block.uuid:
            block_runs_by_block_uuid[block.uuid]['original'] = block_run
        else:
            block_runs_by_block_uuid[block.uuid]['clones'].append(block_run)

    for block_uuid, block in pipeline.blocks_by_uuid.items():
        original_block_dict = block.to_dict()

        brs = block_runs_by_block_uuid.get(block_uuid) or {}
        block_runs_inner = brs.get('clones') or []
        if brs.get('original'):
            block_runs_inner.append(brs.get('original'))

        for block_run in block_runs_inner:
            block = pipeline.get_block(block_run.block_uuid)
            tags = []

            metrics = block_run.metrics or {}
            dynamic_block_index = (metrics or {}).get('dynamic_block_index')
            is_dynamic_child = is_dynamic_block_child(block)
            is_dynamic = is_dynamic_block(block)

            if block.replicated_block:
                tags.append(TAG_REPLICA)
            if is_dynamic:
                tags.append(TAG_DYNAMIC)
            if is_dynamic_child:
                tags.append(TAG_DYNAMIC_CHILD)
            if should_reduce_output(block):
                tags.append(TAG_REDUCE_OUTPUT)

            block_dict = merge_dict(original_block_dict, dict(
                downstream_blocks=[],
                tags=tags,
                upstream_blocks=(metrics or {}).get('upstream_blocks', []) or [],
                uuid=block_run.block_uuid,
            ))

            if dynamic_block_index is not None:
                block_dict['description'] = str(dynamic_block_index)

            for upstream_block in block.upstream_blocks:
                if is_dynamic_block_child(upstream_block):
                    up_brs = block_runs_by_block_uuid.get(upstream_block.uuid) or {}
                    up_block_runs = up_brs.get('clones') or []

                    if should_reduce_output(upstream_block):
                        block_dict['upstream_blocks'].extend(
                            [br.block_uuid for br in up_block_runs or []],
                        )
                    else:
                        dynamic_upstream_block_uuids = (metrics or {}).get(
                            'dynamic_upstream_block_uuids',
                        ) or []
                        if dynamic_upstream_block_uuids:
                            block_dict['upstream_blocks'].extend(list(set(
                                dynamic_upstream_block_uuids + block_dict['upstream_blocks'],
                            )))
                else:
                    block_dict['upstream_blocks'].append(upstream_block.uuid)

            block_dicts_by_uuid[block_run.block_uuid] = block_dict

    # Remove the originals
    for block_uuid, block in pipeline.blocks_by_uuid.items():
        # If all upstream dynamic child blocks reduce output, remove the original upstream
        # from its upstream blocks
        if block.upstream_blocks and all([is_dynamic_block_child(
            up,
        ) and should_reduce_output(
            up,
        ) for up in block.upstream_blocks]):
            for upstream_block in block.upstream_blocks:
                block_dicts_by_uuid[block_uuid]['upstream_blocks'] = list(filter(
                    lambda x, upstream_block=upstream_block: x != upstream_block.uuid,
                    block_dicts_by_uuid[block_uuid]['upstream_blocks'],
                ))

        is_dynamic_child = is_dynamic_block_child(block)
        is_dynamic = is_dynamic_block(block)

        if is_dynamic_child:
            upstream_dynamic_childs = \
                [up for up in block.upstream_blocks if is_dynamic_block_child(up)]

            if not upstream_dynamic_childs or \
                    not all([should_reduce_output(up) for up in upstream_dynamic_childs]):

                uuid = block.uuid_replicated if block.replicated_block else block_uuid
                brs = (block_runs_by_block_uuid.get(uuid) or {}).get('clones') or []
                if brs and len(brs) >= 1:
                    if uuid in block_dicts_by_uuid:
                        block_dicts_by_uuid.pop(uuid, None)

    # Add the originals upstream blocks if the originals are still in the dicts and
    # if the upstream doesn’t reduce output
    for block_uuid, block in pipeline.blocks_by_uuid.items():
        if block.replicated_block:
            block_uuid = block.uuid_replicated

        for up_block in block.upstream_blocks:
            up_uuid = up_block.uuid_replicated if up_block.replicated_block else up_block.uuid

            if is_dynamic_block_child(up_block) and \
                    should_reduce_output(up_block):

                continue

            if block_uuid in block_dicts_by_uuid:
                if up_uuid in block_dicts_by_uuid:
                    block_dicts_by_uuid[block_uuid]['upstream_blocks'].append(up_uuid)
                elif is_dynamic_block(up_block):
                    up_brs = []
                    for block_run in block_runs:
                        up_block2 = pipeline.get_block(block_run.block_uuid)
                        if up_block2.uuid == up_uuid and block_run.block_uuid != up_uuid:
                            up_brs.append(block_run.block_uuid)
                    block_dicts_by_uuid[block_uuid]['upstream_blocks'].extend(up_brs)

    # De-dupe upstream blocks

    return block_dicts_by_uuid


def build_blocks_for_pipeline_run(pipeline_run: PipelineRun, block_uuids: List[str]) -> Dict:
    block_runs = pipeline_run.block_runs
    pipeline = pipeline_run.pipeline

    def __is_dynamic(block_run, pipeline=pipeline):
        block = pipeline.get_block(block_run.block_uuid)
        return is_dynamic_block(block) or is_dynamic_block_child(block)

    if any(__is_dynamic(block_run) for block_run in block_runs):
        return build_dynamic_blocks_for_block_runs(pipeline, block_runs)

    block_count_by_base_uuid = {}
    block_dicts_by_uuid = {}
    data_integration_sets_by_uuid = {}
    dynamic_block_count_by_base_uuid = {}
    dynamic_block_uuids_by_base_uuid = {}
    sources_destinations_by_block_uuid = {}

    block_mapping = {}

    is_data_integration_pipeline = pipeline and PipelineType.INTEGRATION == pipeline.type

    if is_data_integration_pipeline:
        original_blocks_mapping = {}

        for block_run in block_runs:
            block_run_block_uuid = block_run.block_uuid
            if block_uuids and block_run_block_uuid not in block_uuids:
                continue
            block = pipeline.get_block(block_run_block_uuid)
            if not block:
                continue

            if block.uuid not in original_blocks_mapping:
                original_blocks_mapping[block.uuid] = {}

            block_dict = block.to_dict()
            block_dicts_by_uuid[block_run_block_uuid] = block_dict
            original_blocks_mapping[block.uuid][block_run_block_uuid] = block_dict

        for block_run_block_uuid, block_dict in block_dicts_by_uuid.items():
            block_uuid = block_dict.get('uuid')
            block_uuid_parts = block_run_block_uuid.split(':')
            group_parts = [part for part in block_uuid_parts if part != block_uuid]
            group_uuid = ':'.join(group_parts)

            for key in [
                'downstream_blocks',
                'upstream_blocks',
            ]:
                uuids = []
                for block_uuid2 in block_dict.get(key):
                    mapping = original_blocks_mapping.get(block_uuid2)
                    if mapping:
                        for uuid2 in list(mapping.keys()):
                            if uuid2 == ':'.join([block_uuid2, group_uuid]):
                                uuids.append(uuid2)
                    else:
                        uuids.append(block_uuid2)

                block_dict[key] = uuids

            if len(group_parts) >= 1:
                block_dict['tags'] = [group_parts[0]]

            if len(group_parts) >= 2:
                block_dict['description'] = group_parts[1]

            block_dict['name'] = block_uuid
            block_dict['uuid'] = block_run_block_uuid
            block_dicts_by_uuid[block_run_block_uuid] = block_dict

        return block_dicts_by_uuid

    block_runs = pipeline_run.block_runs

    for block_run in block_runs:
        # Handle dynamic blocks and data integration blocks
        block_run_block_uuid = block_run.block_uuid
        block = pipeline.get_block(block_run_block_uuid)

        if block.uuid not in [
            'dynamic_parent_a',
            'dynamic_child_a',
        ]:
            continue

        metrics = block_run.metrics

        if block_run_block_uuid not in block_mapping:
            block_mapping[block_run_block_uuid] = dict(
                block_run=block_run,
                uuids=[],
            )

        if not block:
            if metrics.get('hook'):
                block_dicts_by_uuid[block_run_block_uuid] = dict(
                    configuration=metrics.get('hook_variables'),
                    downstream_blocks=metrics.get('downstream_blocks') or [],
                    tags=[
                        'global hook',
                    ],
                    upstream_blocks=[],
                    uuid=block_run_block_uuid,
                )
            continue

        if block.uuid not in block_count_by_base_uuid:
            block_count_by_base_uuid[block.uuid] = 0
        block_count_by_base_uuid[block.uuid] += 1

        block_dict = block.to_dict()
        if 'tags' not in block_dict:
            block_dict['tags'] = []
        block_dict['uuid'] = block_run_block_uuid

        if metrics and block.is_data_integration():
            child = metrics.get('child')
            controller = metrics.get('controller')
            controller_block_uuid = metrics.get('controller_block_uuid')
            original = metrics.get('original')
            original_block_uuid = metrics.get('original_block_uuid')

            tags = []

            if original:
                if BlockType.DATA_LOADER == block.type:
                    block_dict['description'] = 'Source'
                elif BlockType.DATA_EXPORTER == block.type:
                    block_dict['description'] = 'Destination'
            elif controller and not child:
                block_dict['description'] = 'Controller'
            else:
                block_dict['name'] = original_block_uuid

            if child:
                parts = block_run_block_uuid.split(':')

                source_destination = None
                stream = None
                index = None

                if len(parts) >= 2:
                    source_destination = parts[1]

                    for b_uuid in [
                        controller_block_uuid,
                        original_block_uuid,
                    ]:
                        if b_uuid not in sources_destinations_by_block_uuid:
                            sources_destinations_by_block_uuid[b_uuid] = []

                        if source_destination not in \
                                sources_destinations_by_block_uuid[b_uuid]:

                            sources_destinations_by_block_uuid[b_uuid].append(
                                source_destination,
                            )

                if len(parts) >= 3:
                    stream = parts[2]

                block_mapping[block_run_block_uuid]['uuids'].append(controller_block_uuid)

                if controller:
                    block_dict['description'] = 'Controller'
                else:
                    if len(parts) >= 4:
                        index = str(parts[3])

                    block_dict['description'] = index

                    if original_block_uuid not in block_mapping:
                        block_mapping[original_block_uuid] = dict(uuids=[])
                    block_mapping[original_block_uuid]['uuids'].append(
                        block_run_block_uuid,
                    )

                tags.append(stream)

            if tags:
                block_dict['tags'] = tags

            if original_block_uuid:
                if original_block_uuid not in data_integration_sets_by_uuid:
                    data_integration_sets_by_uuid[original_block_uuid] = dict(
                        children={},
                        controller=None,
                        controllers={},
                        original=None,
                    )

                data = merge_dict(block_dict, dict(metrics=metrics))
                if original:
                    data_integration_sets_by_uuid[original_block_uuid]['original'] = data
                elif child:
                    if controller:
                        data_integration_sets_by_uuid[original_block_uuid]['controllers'][
                            block_run_block_uuid
                        ] = data
                    elif controller_block_uuid:
                        if controller_block_uuid not in \
                                data_integration_sets_by_uuid[original_block_uuid][
                                    'children'
                                ]:
                            data_integration_sets_by_uuid[original_block_uuid][
                                'children'
                            ][controller_block_uuid] = []
                        data_integration_sets_by_uuid[original_block_uuid][
                            'children'
                        ][controller_block_uuid].append(data)
                elif controller:
                    data_integration_sets_by_uuid[original_block_uuid]['controller'] = data

        block_dict['tags'] += block.tags()

        # This is primary used to show global hooks that run before the pipeline execution.
        if metrics and \
                metrics.get('upstream_blocks') and \
                (not block or not is_dynamic_block_child(block)):

            block_dict['upstream_blocks'] = (block_dict.get('upstream_blocks') or []) + (
                metrics.get('upstream_blocks') or []
            )

        block_dicts_by_uuid[block_run_block_uuid] = block_dict

    blocks_to_not_override = {}
    # Reconstruct the upstream blocks for data integrations if the stream
    # is not parallel.
    for original_block_uuid, set_dict in data_integration_sets_by_uuid.items():
        children = set_dict.get('children') or {}
        controller = set_dict.get('controller') or {}
        controllers = set_dict.get('controllers') or {}

        controllers_not_parallel = list(filter(
            lambda x: not (x.get('metrics') or {}).get('run_in_parallel'),
            controllers.values(),
        ))

        # Start from the controller that has no downstream block uuids
        controller_child_end = find(
            lambda x: not (x.get('metrics') or {}).get('downstream_block_uuids'),
            controllers_not_parallel,
        )

        def _update_upstream_block_uuids(
            controller_child: Dict,
            controllers_inner,
            children_inner,
        ):
            uuid = controller_child.get('uuid')
            metrics = controller_child.get('metrics') or {}
            upstream_block_uuids = metrics.get('upstream_block_uuids') or []

            for up_block_uuid in upstream_block_uuids:
                arr = children_inner.get(up_block_uuid) or []

                # Set the upstream controller’s children as upstream blocks for the
                # current controller child.
                block_dicts_by_uuid[uuid]['upstream_blocks'] = [d['uuid'] for d in arr]
                blocks_to_not_override[uuid] = True

                for d_child in arr:
                    child_uuid = d_child['uuid']
                    block_dicts_by_uuid[child_uuid]['upstream_blocks'] = [
                        up_block_uuid,
                    ]
                    block_dicts_by_uuid[child_uuid]['downstream_blocks'] = [
                        uuid,
                    ]
                    blocks_to_not_override[child_uuid] = True

                up_controller = controllers_inner.get(up_block_uuid)
                if up_controller:
                    _update_upstream_block_uuids(
                        up_controller,
                        controllers_inner,
                        children_inner,
                    )

        if controller_child_end:
            _update_upstream_block_uuids(controller_child_end, controllers, children)

            controller_child_end_uuid = controller_child_end.get('uuid')
            children_end = children.get(controller_child_end_uuid) or []

            block_dicts_by_uuid[original_block_uuid]['upstream_blocks'] = \
                [d['uuid'] for d in children_end]
            blocks_to_not_override[original_block_uuid] = True

            downstream_blocks = block_dicts_by_uuid[original_block_uuid].get(
                'downstream_blocks',
            ) or []
            for down_uuid in downstream_blocks:
                blocks_to_not_override[down_uuid] = True

            for up_uuid in block_dicts_by_uuid[original_block_uuid]['upstream_blocks']:
                block_dicts_by_uuid[up_uuid]['upstream_blocks'] = [
                    controller_child_end_uuid,
                ]
                block_dicts_by_uuid[up_uuid]['downstream_blocks'] = [
                    original_block_uuid,
                ]
                blocks_to_not_override[up_uuid] = True

        controller_child_start = find(
            lambda x: not (x.get('metrics') or {}).get('upstream_block_uuids'),
            controllers_not_parallel,
        )

        if controller_child_start:
            controller_child_start_uuid = controller_child_start['uuid']
            block_dicts_by_uuid[controller_child_start_uuid]['upstream_blocks'] = [
                controller.get('uuid'),
            ]
            blocks_to_not_override[controller_child_start_uuid] = True

    for block_uuid, mapping in block_mapping.items():
        block = pipeline.get_block(block_uuid)
        if not block:
            continue

        if block_uuid not in block_dicts_by_uuid:
            continue

        block_run = mapping.get('block_run')
        metrics = block_run.metrics if block_run else None
        upstream_block_uuids = mapping['uuids']

        child = False
        controller = False
        original = False
        is_data_integration = block.is_data_integration()
        if metrics and is_data_integration:
            child = metrics.get('child')
            controller = metrics.get('controller')
            original = metrics.get('original')

        if original or (controller and not child):
            if block_uuid in sources_destinations_by_block_uuid:
                if 'tags' not in block_dicts_by_uuid[block_uuid]:
                    block_dicts_by_uuid[block_uuid] = []
                block_dicts_by_uuid[block_uuid]['tags'].append(
                    sources_destinations_by_block_uuid[block_uuid],
                )

        if block_uuid in blocks_to_not_override:
            continue

        if original:
            # The original block should only have upstreams that are
            # child blocks and not controllers.
            block_dicts_by_uuid[block_uuid]['upstream_blocks'] = []

        for ub_uuid in upstream_block_uuids:
            if ub_uuid in block_dicts_by_uuid[block_uuid]['upstream_blocks']:
                continue

            if is_data_integration:
                # A child can only have 1 upstream: the controller that made it.
                if child:
                    block_dicts_by_uuid[block_uuid]['upstream_blocks'] = [ub_uuid]
                    continue
                elif original:
                    block_dicts_by_uuid[block_uuid]['upstream_blocks'].append(ub_uuid)
            else:
                block_dicts_by_uuid[block_uuid]['upstream_blocks'].append(ub_uuid)

        upstream_block_uuids_to_replace = {}

        for up_uuid, uuids in upstream_block_uuids_to_replace.items():
            arr = block_dicts_by_uuid[block_uuid]['upstream_blocks']
            block_dicts_by_uuid[block_uuid]['upstream_blocks'] = \
                [uuid for uuid in arr if uuid != up_uuid] + uuids

    # Adjust the runtime for these blocks because it has a start_at
    # but we don’t actually start running the block until later.
    for set_dict in data_integration_sets_by_uuid.values():
        children = set_dict.get('children') or {}
        controller = set_dict.get('controller') or {}
        controllers = set_dict.get('controllers') or {}
        original = set_dict.get('original') or {}

        for controller_uuid in [
            controller.get('uuid'),
        ] + list(controllers.keys()):
            if controller_uuid in block_dicts_by_uuid:
                block_run = block_mapping.get(controller_uuid, {}).get('block_run')
                if block_run and block_run.started_at:
                    block_dict = block_dicts_by_uuid[controller_uuid]
                    downstream_started_ats = []
                    for db_uuid in (block_dict.get('downstream_blocks') or []):
                        db_block_run = block_mapping.get(db_uuid, {}).get('block_run')
                        if db_block_run and db_block_run.started_at:
                            downstream_started_ats.append(db_block_run.started_at)

                    if downstream_started_ats:
                        started_at_e = max(downstream_started_ats)
                        block_dicts_by_uuid[controller_uuid]['runtime'] = \
                            started_at_e.timestamp() - block_run.started_at.timestamp()

    dynamic_blocks_beyond_1 = {}
    for base_uuid, count in dynamic_block_count_by_base_uuid.items():
        if count >= 2:
            dynamic_blocks_beyond_1[base_uuid] = count

    # 200
    total_blocks = sum(list(block_count_by_base_uuid.values()))
    # 202
    total_blocks_dynamic_beyond_1 = sum(list(dynamic_blocks_beyond_1.values()))

    if total_blocks > MAX_BLOCKS_FOR_TREE:
        # 200 - 40 = 160
        remove_this_much = total_blocks - MAX_BLOCKS_FOR_TREE
        # 202 - 160 = 42
        if total_blocks_dynamic_beyond_1 > remove_this_much:
            # 42
            keep_this_much = total_blocks_dynamic_beyond_1 - remove_this_much
            # 42 / 202 = 0.2
            percent_to_keep = keep_this_much / total_blocks_dynamic_beyond_1

            for base_uuid, count in dynamic_blocks_beyond_1.items():
                uuids = dynamic_block_uuids_by_base_uuid.get(base_uuid) or []
                keep_count = max(math.floor(percent_to_keep * count), 1)

                uuids_to_remove = uuids[keep_count:]
                # Remove this much
                for uuid in uuids_to_remove:
                    if uuid not in block_dicts_by_uuid:
                        continue

                    block_dict = block_dicts_by_uuid[uuid]
                    # Remove this block UUID from everything that is
                    # upstream and downstream to it.
                    for uuids_to_loop, key_to_remove_from in [
                        ('upstream_blocks', 'downstream_blocks'),
                        ('downstream_blocks', 'upstream_blocks'),
                    ]:
                        for uuids_inner in block_dict[uuids_to_loop]:
                            if uuids_inner not in block_dicts_by_uuid:
                                continue

                            arr = block_dicts_by_uuid[uuids_inner][key_to_remove_from]
                            block_dicts_by_uuid[uuids_inner][key_to_remove_from] = \
                                [i for i in arr if i != uuid]

                    block_dicts_by_uuid.pop(uuid, None)

    return block_dicts_by_uuid
