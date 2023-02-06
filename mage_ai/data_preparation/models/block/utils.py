from mage_ai.shared.array import find, unique_by
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.utils import clean_name as clean_name_orig
from typing import Any, Dict, List
import json
import pandas as pd


def clean_name(name: str, **kwargs) -> str:
    return clean_name_orig(name, allow_characters=['/'], **kwargs)


def dynamic_block_uuid(
    block_uuid: str,
    metadata: Dict,
    index: int,
) -> str:
    block_uuid_subname = metadata.get('block_uuid', index)
    return f'{block_uuid}:{block_uuid_subname}'


def create_block_run_from_dynamic_child(
    block,
    pipeline_run,
    block_metadata: Dict,
    index: int,
):
    metadata = block_metadata.copy()
    metadata.update(dict(dynamic_block_index=index))

    block_uuid = dynamic_block_uuid(block.uuid, metadata, index)
    block_run = pipeline_run.create_block_run(block_uuid, metrics=metadata)

    return block_run


def create_block_runs_from_dynamic_block(
    block,
    pipeline_run,
    block_uuid: str = None,
) -> List:
    block_uuid_original = block.uuid
    block_uuid = block_uuid_original if block_uuid is None else block_uuid
    execution_partition = pipeline_run.execution_partition

    values = []
    block_metadata = []
    for idx, output_name in enumerate(block.output_variables()):
        if idx == 0:
            values = block.pipeline.variable_manager.get_variable(
                block.pipeline.uuid,
                block_uuid,
                output_name,
                partition=execution_partition,
            )
        elif idx == 1:
            block_metadata = block.pipeline.variable_manager.get_variable(
                block.pipeline.uuid,
                block_uuid,
                output_name,
                partition=execution_partition,
            )

    all_block_runs = []
    # Dynamic child blocks (aka created from a dynamic block)
    for downstream_block in block.downstream_blocks:
        is_dynamic = is_dynamic_block(downstream_block)
        should_reduce = should_reduce_output(downstream_block)
        descendants = get_all_descendants(downstream_block)

        block_runs_created_by_block_uuid = {}
        dynamic_child_block_runs = []
        for idx, value in enumerate(values):
            if idx < len(block_metadata):
                metadata = block_metadata[idx].copy()
            else:
                metadata = {}

            arr = []
            for upstream_block in downstream_block.upstream_blocks:
                if block_uuid_original == upstream_block.uuid and block_uuid_original != block_uuid:
                    arr.append(block_uuid)
                else:
                    arr.append(upstream_block.uuid)
            block_run = create_block_run_from_dynamic_child(
                downstream_block,
                pipeline_run,
                merge_dict(metadata, dict(
                    dynamic_upstream_block_uuids=arr,
                )),
                idx,
            )
            all_block_runs.append(block_run)
            dynamic_child_block_runs.append(block_run)

            if is_dynamic or should_reduce:
                continue

            # Schedule all descendants
            for b in descendants:
                # If block has dynamic upstream, skip since creation of downstream
                # is handled in pipeline scheduler
                if find(lambda x: is_dynamic_block(x), b.upstream_blocks):
                    continue

                arr = []
                for upstream_block in b.upstream_blocks:
                    ancestors = get_all_ancestors(upstream_block)
                    # If the upstream block has the current dynamic child as an ancestor,
                    # then have this block depend on a block UUID with the dynamic UUID suffix;
                    # e.g. block_uuid:index
                    if downstream_block.uuid in [a.uuid for a in ancestors]:
                        arr.append(dynamic_block_uuid(upstream_block.uuid, metadata, idx))
                    elif downstream_block.uuid == upstream_block.uuid:
                        arr.append(block_run.block_uuid)
                    else:
                        arr.append(upstream_block.uuid)

                b_uuid = dynamic_block_uuid(b.uuid, metadata, idx)
                if b_uuid in block_runs_created_by_block_uuid:
                    continue
                block_runs_created_by_block_uuid[b_uuid] = True

                br = create_block_run_from_dynamic_child(
                    b,
                    pipeline_run,
                    merge_dict(metadata, dict(
                        dynamic_upstream_block_uuids=arr,
                    )),
                    idx,
                )
                all_block_runs.append(br)

        if should_reduce:
            for b in descendants:
                ancestors = get_all_ancestors(b)
                unique_dynamic_ancestors = unique_by(
                    list(filter(lambda x: is_dynamic_block(x), ancestors)),
                    lambda x: x.uuid,
                )

                skip_creating_downstream = False
                ancestors_uuids = [a.uuid for a in ancestors]
                for dynamic_ancestor in unique_dynamic_ancestors:
                    if skip_creating_downstream:
                        continue

                    down_uuids = [down.uuid for down in dynamic_ancestor.downstream_blocks]
                    down_uuids_as_ancestors = [i for i in down_uuids if i in ancestors_uuids]
                    skip_creating_downstream = len(down_uuids_as_ancestors) >= 2

                # Only create downstream block runs if it doesn’t have dynamically created upstream
                # blocks (aka dynamic child) that were created by a 2nd ancestor that is a dynamic
                # block
                if skip_creating_downstream:
                    continue

                arr = []
                for upstream_block in b.upstream_blocks:
                    if downstream_block.uuid == upstream_block.uuid:
                        arr += [b.block_uuid for b in dynamic_child_block_runs]
                    else:
                        arr.append(upstream_block.uuid)

                all_block_runs.append(pipeline_run.create_block_run(
                    b.uuid,
                    metrics=dict(dynamic_upstream_block_uuids=arr),
                ))

    return all_block_runs


def get_all_ancestors(block) -> List:
    arr = get_leaf_nodes(block, 'upstream_blocks', include_all_nodes=True)
    return list(filter(
        lambda x: x.uuid != block.uuid,
        arr,
    ))


def get_all_descendants(block) -> List:
    arr = get_leaf_nodes(block, 'downstream_blocks', include_all_nodes=True)
    return list(filter(
        lambda x: x.uuid != block.uuid,
        arr,
    ))


def get_leaf_nodes(
    block,
    attribute_key: str,
    condition=None,
    include_all_nodes: bool = False,
) -> List:
    leafs = []

    def _get_leaf_nodes(b):
        if condition is None or condition(b):
            if b is not None:
                arr = getattr(b, attribute_key)
                if len(arr) == 0 or (include_all_nodes and b.uuid != block.uuid):
                    leafs.append(b)

                for n in arr:
                    _get_leaf_nodes(n)

    _get_leaf_nodes(block)

    return leafs


def is_dynamic_block(block) -> bool:
    return block.configuration and block.configuration.get('dynamic', False)


def should_reduce_output(block) -> bool:
    return block.configuration and block.configuration.get('reduce_output', False)


def output_variables(
    pipeline,
    block_uuid: str,
    execution_partition: str = None,
) -> List[str]:
    """Return output variables in dictionary.
    The key is the variable name, and the value is variable data type.

    Args:
        execution_partition (str, optional): The execution paratition string.

    Returns:
        List[str]: List of variable names.
    """
    all_variables = pipeline.variable_manager.get_variables_by_block(
        pipeline.uuid,
        block_uuid,
        partition=execution_partition,
    )
    output_variables = [v for v in all_variables if is_output_variable(v)]
    output_variables.sort()

    return output_variables


def is_output_variable(variable_uuid: str) -> bool:
    return variable_uuid == 'df' or variable_uuid.startswith('output')


def is_valid_print_variable(k, v, block_uuid):
    if f'{block_uuid}_' not in k:
        return False
    if type(v) is not str:
        return False
    # Not store empty json
    if v == '{}' or v == '':
        return False
    try:
        json_data = json.loads(v)
        # Not store empty data in json object
        if 'data' in json_data and not json_data['data']:
            return False
    except Exception:
        pass
    return True


def input_variables(
    pipeline,
    upstream_block_uuids: List[str],
    execution_partition: str = None,
) -> Dict[str, List[str]]:
    """Get input variables from upstream blocks' output variables.
    Args:
        execution_partition (str, optional): The execution paratition string.

    Returns:
        Dict[str, List[str]]: Mapping from upstream block uuid to a list of variable names
    """
    return {block_uuid: output_variables(pipeline, block_uuid, execution_partition)
            for block_uuid in upstream_block_uuids}


def fetch_input_variables(
    pipeline,
    upstream_block_uuids: List[str],
    input_args: List[Any],
    execution_partition: str = None,
    global_vars: Dict = None,
    dynamic_block_index: int = None,
    dynamic_upstream_block_uuids: List[str] = None,
):
    spark = (global_vars or dict()).get('spark')
    upstream_block_uuids_final = []

    input_vars = []
    if input_args is not None:
        input_vars = input_args
    elif pipeline is not None:
        input_vars = [None for i in range(len(upstream_block_uuids))]
        input_variables_by_uuid = input_variables(
            pipeline,
            upstream_block_uuids,
            execution_partition,
        )
        keys = input_variables_by_uuid.keys()
        reduce_output_indexes = []

        for idx, upstream_block_uuid in enumerate(keys):
            upstream_block_uuids_final.append(upstream_block_uuid)
            upstream_block = pipeline.get_block(upstream_block_uuid)
            should_reduce = should_reduce_output(upstream_block)

            variables = input_variables_by_uuid[upstream_block_uuid]
            variable_values = [
                pipeline.variable_manager.get_variable(
                    pipeline.uuid,
                    upstream_block_uuid,
                    var,
                    partition=execution_partition,
                    spark=spark,
                )
                for var in variables
            ]

            upstream_in_dynamic_upstream = dynamic_upstream_block_uuids and find(
                lambda x: upstream_block_uuid in x,
                dynamic_upstream_block_uuids or [],
            )

            if dynamic_upstream_block_uuids and (should_reduce or upstream_in_dynamic_upstream):
                reduce_output_indexes.append((idx, upstream_block_uuid))
            elif is_dynamic_block(upstream_block):
                val = None
                if len(variable_values) >= 1:
                    arr = variable_values[0]
                    index_to_use = 0 if dynamic_block_index is None else dynamic_block_index
                    if type(arr) is list and len(arr) >= 1 and index_to_use < len(arr):
                        val = arr[index_to_use]
                input_vars[idx] = val
            elif not dynamic_upstream_block_uuids or not upstream_in_dynamic_upstream:
                if type(variable_values) is list and len(variable_values) == 1:
                    final_val = variable_values[0]
                else:
                    final_val = variable_values

                if should_reduce:
                    final_val = [final_val]

                input_vars[idx] = final_val

        if dynamic_upstream_block_uuids:
            for tup in reduce_output_indexes:
                idx = tup[0]
                upstream_block_uuid = tup[1]

                upstream_block = pipeline.get_block(upstream_block_uuid)
                should_reduce = should_reduce_output(upstream_block)
                upstream_is_dynamic = is_dynamic_block(upstream_block)

                uuids = list(
                    filter(lambda x: upstream_block_uuid in x, dynamic_upstream_block_uuids),
                )
                input_variables_by_uuid = input_variables(
                    pipeline,
                    uuids,
                    execution_partition,
                )

                final_value = []
                for key, variables in input_variables_by_uuid.items():
                    end_idx = 1 if upstream_is_dynamic else len(variables)
                    for var in variables[:end_idx]:
                        variable_values = pipeline.variable_manager.get_variable(
                            pipeline.uuid,
                            key,
                            var,
                            partition=execution_partition,
                            spark=spark,
                        )

                        if type(variable_values) is list and len(variable_values) == 1:
                            val = variable_values[0]
                        else:
                            val = variable_values

                        if type(val) is list:
                            final_value += val
                        else:
                            final_value.append(val)

                if len(final_value) >= 1 and type(final_value[0]) is pd.DataFrame:
                    final_value = pd.concat(final_value)

                if not should_reduce:
                    # Only get the 1st output of a dynamic block;
                    # the 2nd output is the dynamic child block’s metadata
                    if upstream_is_dynamic and dynamic_block_index is not None:
                        final_value = final_value[dynamic_block_index]

                    if type(final_value) is not pd.DataFrame and \
                        type(final_value) is list and \
                            len(final_value) == 1:
                        final_value = final_value[0]

                input_vars[idx] = final_value

    return input_vars, upstream_block_uuids_final
