import math
import urllib.parse
from typing import Dict

from mage_ai.api.errors import ApiError
from mage_ai.api.operations.constants import META_KEY_LIMIT, META_KEY_OFFSET
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.cache.block import BlockCache
from mage_ai.cache.block_action_object import BlockActionObjectCache
from mage_ai.cache.block_action_object.constants import (
    OBJECT_TYPE_BLOCK_FILE,
    OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE,
    OBJECT_TYPE_MAGE_TEMPLATE,
)
from mage_ai.data_preparation.models.block import Block
from mage_ai.data_preparation.models.block.dynamic.utils import (
    dynamically_created_child_block_runs,
)
from mage_ai.data_preparation.models.block.utils import (
    clean_name,
    is_dynamic_block,
    is_dynamic_block_child,
    should_reduce_output,
)
from mage_ai.data_preparation.models.constants import (
    FILE_EXTENSION_TO_BLOCK_LANGUAGE,
    BlockLanguage,
    BlockType,
    PipelineType,
)
from mage_ai.data_preparation.models.custom_templates.custom_block_template import (
    CustomBlockTemplate,
)
from mage_ai.data_preparation.models.pipeline import Pipeline
from mage_ai.data_preparation.templates.data_integrations.constants import (
    TEMPLATE_TYPE_DATA_INTEGRATION,
)
from mage_ai.data_preparation.utils.block.convert_content import convert_to_block
from mage_ai.orchestration.db import safe_db_query
from mage_ai.orchestration.db.models.schedules import PipelineRun
from mage_ai.settings.repo import get_repo_path
from mage_ai.shared.array import find
from mage_ai.shared.hash import merge_dict
from mage_ai.usage_statistics.logger import UsageStatisticLogger

MAX_BLOCKS_FOR_TREE = 100


class BlockResource(GenericResource):
    @classmethod
    @safe_db_query
    def collection(self, query_arg, meta, user, **kwargs):
        parent_model = kwargs.get('parent_model')

        block_uuids = query_arg.get('block_uuid[]', [])
        if block_uuids:
            block_uuids = block_uuids[0]
        if block_uuids:
            block_uuids = set(block_uuids.split(','))

        block_count_by_base_uuid = {}
        block_dicts_by_uuid = {}
        data_integration_sets_by_uuid = {}
        dynamic_block_count_by_base_uuid = {}
        dynamic_block_uuids_by_base_uuid = {}
        sources_destinations_by_block_uuid = {}

        if isinstance(parent_model, Pipeline):
            for block_uuid, block in parent_model.blocks_by_uuid.items():
                if not block_uuids or block_uuid in block_uuids:
                    block_dicts_by_uuid[block_uuid] = block.to_dict()

        if isinstance(parent_model, PipelineRun):
            block_mapping = {}

            pipeline = parent_model.pipeline
            is_data_integration_pipeline = pipeline and PipelineType.INTEGRATION == pipeline.type

            if is_data_integration_pipeline:
                original_blocks_mapping = {}

                for block_run in parent_model.block_runs:
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

                return self.build_result_set(
                    block_dicts_by_uuid.values(),
                    user,
                    **kwargs,
                )

            block_runs = parent_model.block_runs

            for block_run in block_runs:
                # Handle dynamic blocks and data integration blocks
                block_run_block_uuid = block_run.block_uuid
                block = pipeline.get_block(block_run_block_uuid)
                metrics = block_run.metrics

                # If block is dynamic child and the original block’s block run, skip.
                if is_dynamic_block_child(block) and block.uuid == block_run_block_uuid:
                    # Show the block if no other dynamic child block runs have been created:
                    if dynamically_created_child_block_runs(pipeline, block, block_runs):
                        continue

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

                # If dynamic child, then it has many other blocks.
                if is_dynamic_block_child(block):
                    if block.uuid not in dynamic_block_count_by_base_uuid:
                        dynamic_block_count_by_base_uuid[block.uuid] = 0
                    dynamic_block_count_by_base_uuid[block.uuid] += 1

                    if block.uuid not in dynamic_block_uuids_by_base_uuid:
                        dynamic_block_uuids_by_base_uuid[block.uuid] = []
                    dynamic_block_uuids_by_base_uuid[block.uuid].append(block_run_block_uuid)

                    parts = block_run_block_uuid.split(':')

                    # [block_uuid]:[index_1]:[index_2]...:[index_N]
                    parts_length = len(parts)
                    if parts_length >= 2:
                        block_dict['description'] = ':'.join(parts[1:])

                    #     e_i = parts_length - 1
                    #     parts_new = parts[1:e_i]

                    #     for upstream_block in block.upstream_blocks:
                    #         if is_dynamic_block_child(upstream_block):
                    #             parts_new = [upstream_block.uuid] + parts_new
                    #             block_mapping[block_run_block_uuid]['uuids'].append(
                    #                 ':'.join(parts_new),
                    #             )

                    if metrics:
                        for key in [
                            'dynamic_upstream_block_uuids',
                        ]:
                            if metrics.get(key):
                                block_mapping[block_run_block_uuid]['uuids'].extend(
                                    metrics.get(key) or [],
                                )

                    # If it should reduce, then all the children have 1 downstream.
                    if should_reduce_output(block):
                        for db in block.downstream_blocks:
                            if db.uuid not in block_mapping:
                                block_mapping[db.uuid] = dict(uuids=[])

                            block_mapping[db.uuid]['uuids'].append(block_run_block_uuid)
                    # else:
                    #     # If not reduce, then there will be multiple instances of
                    #     # its downstream blocks.
                    #     for db in block.downstream_blocks:
                    #         db_uuid = ':'.join([db.uuid] + parts[1:])
                    #         if db_uuid not in block_mapping:
                    #             block_mapping[db_uuid] = dict(uuids=[])
                    #         block_mapping[db_uuid]['uuids'].append(block_run_block_uuid)

                if block.replicated_block:
                    block_dict['name'] = block.uuid
                    block_dict['description'] = block.replicated_block

                block_dict['tags'] += block.tags()

                # This is primary used to show global hooks that run before the pipeline execution.
                if metrics and \
                        metrics.get('upstream_blocks') and \
                        (not block or not is_dynamic_block_child(block)):

                    block_dict['upstream_blocks'] = (block_dict.get('upstream_blocks') or []) + (
                        metrics.get('upstream_blocks') or []
                    )

                block_dicts_by_uuid[block_run_block_uuid] = block_dict

            # Replace upstream and downstream blocks that contain the base UUID
            # of a replicated block (e.g. [block_uuid]) and replace it with the full
            # replicated block UUID (e.g. [block_uuid]:[replicated_block_uuid])
            for block_uuid, block_dict in block_dicts_by_uuid.items():
                for key in [
                    'downstream_blocks',
                    'upstream_blocks',
                ]:
                    arr = block_dict.get(key) or []
                    for block_uuid_base in arr:
                        block = pipeline.get_block(block_uuid_base)
                        if block is None:
                            # If the block is a Widget, `get_block` will return None
                            continue
                        if block.replicated_block and not is_dynamic_block_child(block):
                            blocks_arr = block_dicts_by_uuid[block_uuid].get(key) or []
                            block_dicts_by_uuid[block_uuid][key] = \
                                [uuid for uuid in blocks_arr if uuid != block_uuid_base]
                            block_dicts_by_uuid[block_uuid][key].append(block.uuid_replicated)

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

                    ub_block = pipeline.get_block(ub_uuid)
                    # If the upstream block is a dynamic child,
                    # remove the dynamic child block’s original UUID from
                    # the current block’s upstream blocks.
                    if ub_block and \
                            is_dynamic_block_child(ub_block) and \
                            ub_block.uuid in block_dicts_by_uuid[block_uuid]['upstream_blocks']:

                        block_dicts_by_uuid[block_uuid]['upstream_blocks'] = \
                            [uuid for uuid in
                                block_dicts_by_uuid[block_uuid]['upstream_blocks']
                                if uuid != ub_block.uuid]

                upstream_block_uuids_to_replace = {}

                for up_block_uuid in block_dicts_by_uuid[block_uuid]['upstream_blocks']:
                    up_block = pipeline.get_block(up_block_uuid)

                    # If the current block is a dynamic child and its upstream is a dynamic child:
                    if up_block and is_dynamic_block_child(up_block) and \
                            is_dynamic_block_child(block):

                        if not dynamically_created_child_block_runs(
                            pipeline,
                            block,
                            block_runs,
                        ):
                            up_block_runs = dynamically_created_child_block_runs(
                                pipeline,
                                up_block,
                                block_runs,
                            )
                            if len(up_block_runs) >= 1:
                                upstream_block_uuids_to_replace[up_block_uuid] = \
                                    [br.block_uuid for br in up_block_runs]

                    if up_block_uuid not in block_dicts_by_uuid:
                        continue

                    if block_uuid not in block_dicts_by_uuid[up_block_uuid]:
                        if block_uuid not in \
                                block_dicts_by_uuid[up_block_uuid]['downstream_blocks']:

                            block_dicts_by_uuid[up_block_uuid]['downstream_blocks'].append(
                                block_uuid,
                            )

                    if up_block and is_dynamic_block(up_block):
                        for db_block_uuid in \
                                block_dicts_by_uuid[up_block_uuid]['downstream_blocks']:

                            db_block = pipeline.get_block(db_block_uuid)
                            # Remove the original block UUID
                            if db_block and is_dynamic_block_child(db_block):
                                block_dicts_by_uuid[up_block_uuid]['downstream_blocks'] = \
                                    [uuid for uuid in
                                        block_dicts_by_uuid[up_block_uuid]['downstream_blocks']
                                        if uuid != db_block.uuid]

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

        return self.build_result_set(
            block_dicts_by_uuid.values(),
            user,
            **kwargs,
        )

    @classmethod
    async def process_collection(self, query_arg, meta, user, **kwargs):
        total_results = self.collection(query_arg, meta, user, **kwargs)
        total_count = len(total_results)

        limit = int((meta or {}).get(META_KEY_LIMIT, 0))
        offset = int((meta or {}).get(META_KEY_OFFSET, 0))

        final_results = total_results
        has_next = False
        if limit > 0:
            start_idx = offset
            end_idx = start_idx + limit

            results = total_results[start_idx:(end_idx + 1)]

            results_size = len(results)
            has_next = results_size > limit
            final_end_idx = results_size - 1 if has_next else results_size
            final_results = results[0:final_end_idx]

        result_set = self.build_result_set(
            final_results,
            user,
            **kwargs,
        )
        result_set.metadata = {
            'count': total_count,
            'next': has_next,
        }
        return result_set

    @classmethod
    @safe_db_query
    async def create(self, payload, user, **kwargs):
        pipeline = kwargs.get('parent_model')

        block_type = payload.get('type')
        content = payload.get('content')
        language = payload.get('language')
        name = payload.get('name')
        block_name = name or payload.get('uuid')
        require_unique_name = payload.get('require_unique_name')

        payload_config = payload.get('config') or {}

        block_action_object = payload.get('block_action_object')
        if block_action_object:
            object_type = block_action_object.get('object_type')

            cache_block_action_object = await BlockActionObjectCache.initialize_cache()
            mapping = cache_block_action_object.load_all_data()
            objects_mapping = mapping.get(object_type)
            object_uuid = block_action_object.get('uuid')
            object_from_cache = objects_mapping.get(object_uuid)

            if OBJECT_TYPE_BLOCK_FILE == object_type:
                block_name = object_from_cache.get('uuid')
                block_type = object_from_cache.get('type')
                language = object_from_cache.get('language')
            elif OBJECT_TYPE_CUSTOM_BLOCK_TEMPLATE == object_type:
                payload_config['custom_template_uuid'] = object_from_cache.get('template_uuid')
            elif OBJECT_TYPE_MAGE_TEMPLATE == object_type:
                block_type = object_from_cache.get('block_type')
                payload_config['template_path'] = object_from_cache.get('path')

                if TEMPLATE_TYPE_DATA_INTEGRATION != object_from_cache.get('template_type'):
                    language = object_from_cache.get('language')

                for key in [
                    'template_type',
                    'template_variables',
                ]:
                    if object_from_cache.get(key):
                        payload_config[key] = object_from_cache.get(key)

                payload['configuration'] = merge_dict(
                    payload.get('configuration') or {},
                    object_from_cache.get('configuration') or {},
                )

        """
        New DBT models include "content" in its block create payload,
        whereas creating blocks from existing DBT model files do not.
        """
        if payload.get('type') == BlockType.DBT and language == BlockLanguage.SQL and content:
            from mage_ai.data_preparation.models.block.dbt import DBTBlock

            dbt_block = DBTBlock(
                name,
                clean_name(name),
                BlockType.DBT,
                configuration=payload.get('configuration'),
                language=language,
            )
            if dbt_block.file_path and dbt_block.file.exists():
                raise Exception('DBT model at that folder location already exists. \
                    Please choose a different model name, or add a DBT model by \
                    selecting single model from file.')

        block_attributes = dict(
            color=payload.get('color'),
            config=payload_config,
            configuration=payload.get('configuration'),
            downstream_block_uuids=payload.get('downstream_blocks', []),
            extension_uuid=payload.get('extension_uuid'),
            language=language,
            pipeline=pipeline,
            priority=payload.get('priority'),
            upstream_block_uuids=payload.get('upstream_blocks', []),
        )

        replicated_block = None
        replicated_block_uuid = payload.get('replicated_block')
        if replicated_block_uuid:
            replicated_block = pipeline.get_block(replicated_block_uuid)
            if replicated_block:
                block_type = replicated_block.type
                block_attributes['language'] = replicated_block.language
                block_attributes['replicated_block'] = replicated_block.uuid
            else:
                error = ApiError.RESOURCE_INVALID.copy()
                error.update(
                    message=f'Replicated block {replicated_block_uuid} ' +
                    f'does not exist in pipeline {pipeline.uuid}.',
                )
                raise ApiError(error)

        custom_template = None
        if payload_config and payload_config.get('custom_template_uuid'):
            template_uuid = payload_config.get('custom_template_uuid')
            custom_template = CustomBlockTemplate.load(template_uuid=template_uuid)
            block = custom_template.create_block(
                block_name,
                pipeline,
                extension_uuid=block_attributes.get('extension_uuid'),
                priority=block_attributes.get('priority'),
                upstream_block_uuids=block_attributes.get('upstream_block_uuids'),
            )
            content = custom_template.load_template_content()
        else:
            block = Block.create(
                block_name,
                block_type,
                get_repo_path(),
                require_unique_name=require_unique_name,
                **block_attributes,
            )

        if content:
            if payload.get('converted_from'):
                content = convert_to_block(block, content)

            block.update_content(content)

        if pipeline:
            cache = await BlockCache.initialize_cache()
            cache.add_pipeline(block, pipeline)

        cache_block_action_object = await BlockActionObjectCache.initialize_cache()
        cache_block_action_object.update_block(block)

        if block:
            await UsageStatisticLogger().block_create(
                block,
                block_action_object=block_action_object,
                custom_template=custom_template,
                payload_config=payload_config,
                pipeline=pipeline,
                replicated_block=replicated_block,
            )

        return self(block, user, **kwargs)

    @classmethod
    @safe_db_query
    def member(self, pk, user, **kwargs):
        error = ApiError.RESOURCE_INVALID.copy()

        query = kwargs.get('query', {})

        extension_uuid = query.get('extension_uuid', [None])
        if extension_uuid:
            extension_uuid = extension_uuid[0]

        block_type = query.get('block_type', [None])
        if block_type:
            block_type = block_type[0]

        pipeline = kwargs.get('parent_model')
        if pipeline:
            block = pipeline.get_block(pk, block_type=block_type, extension_uuid=extension_uuid)
            if block:
                return self(block, user, **kwargs)
            else:
                if extension_uuid:
                    message = f'Block {pk} does not exist in pipeline {pipeline.uuid} ' \
                        f'for extension {extension_uuid}.'
                else:
                    message = f'Block {pk} does not exist in pipeline {pipeline.uuid}.'
                error.update(message=message)
                raise ApiError(error)

        block_type_and_uuid = urllib.parse.unquote(pk)
        parts = block_type_and_uuid.split('/')

        if len(parts) < 2:
            error.update(message='The url path should be in block_type/block_uuid format.')
            raise ApiError(error)

        block_type = parts[0]
        block_uuid_with_extension = '/'.join(parts[1:])
        parts2 = block_uuid_with_extension.split('.')

        language = None
        if len(parts2) >= 2:
            block_uuid = '.'.join(parts2[:-1])
            language = FILE_EXTENSION_TO_BLOCK_LANGUAGE[parts2[-1]]
        else:
            block_uuid = block_uuid_with_extension

        block_language = query.get('block_language', [None])
        if block_language:
            block_language = block_language[0]
        if block_language:
            language = block_language

        if BlockType.DBT == block_type:
            from mage_ai.data_preparation.models.block.dbt import DBTBlock

            block = DBTBlock(
                block_uuid,
                block_uuid,
                block_type,
                configuration=dict(file_path=block_uuid_with_extension),
                language=language,
            )
        else:
            block = Block.get_block(block_uuid, block_uuid, block_type, language=language)

        if not block.exists():
            error.update(ApiError.RESOURCE_NOT_FOUND)
            raise ApiError(error)

        return self(block, user, **kwargs)

    @safe_db_query
    async def delete(self, **kwargs):
        query = kwargs.get('query', {})

        force = query.get('force', [False])
        if force:
            force = force[0]

        pipeline = kwargs.get('parent_model')
        cache = await BlockCache.initialize_cache()
        if pipeline:
            cache.remove_pipeline(self.model, pipeline.uuid)

        cache_block_action_object = await BlockActionObjectCache.initialize_cache()
        cache_block_action_object.update_block(self.model, remove=True)

        return self.model.delete(force=force)

    @safe_db_query
    async def update(self, payload, **kwargs):
        cache_block_action_object = await BlockActionObjectCache.initialize_cache()
        cache_block_action_object.update_block(self.model, remove=True)

        query = kwargs.get('query', {})
        update_state = query.get('update_state', [False])
        if update_state:
            update_state = update_state[0]
        self.model.update(
            payload,
            update_state=update_state,
        )

        cache_block_action_object.update_block(self.model)

    async def get_pipelines_from_cache(self):
        await BlockCache.initialize_cache()

        return self.model.get_pipelines_from_cache()
