import json
from typing import Any, Dict, List, Tuple

import pandas as pd

from mage_ai.shared.array import find, unique_by
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.utils import clean_name as clean_name_orig


def clean_name(name: str, **kwargs) -> str:
    """
    Cleans the given name by removing invalid characters.

    Args:
        name (str): The name to clean.
        **kwargs: Additional keyword arguments.

    Returns:
        str: The cleaned name.

    """
    return clean_name_orig(name, allow_characters=['/'], **kwargs)


def dynamic_block_uuid(
    block_uuid: str,
    metadata: Dict,
    index: int,
    upstream_block_uuid: str = None,
) -> str:
    """
    Generates a dynamic block UUID based on the given parameters.

    Args:
        block_uuid (str): The UUID of the parent block.
        metadata (Dict): The metadata of the block.
        index (int): The index of the dynamic block.
        upstream_block_uuid (str, optional): The UUID of the upstream block.

    Returns:
        str: The generated dynamic block UUID.

    """
    block_uuid_subname = metadata.get('block_uuid', index)
    uuid = f'{block_uuid}:{block_uuid_subname}'

    if upstream_block_uuid:
        parts = upstream_block_uuid.split(':')
        if len(parts) >= 2:
            upstream_indexes = ':'.join(parts[1:])
            uuid = f'{uuid}:{upstream_indexes}'

    return uuid


def create_block_run_from_dynamic_child(
    block,
    pipeline_run,
    block_metadata: Dict,
    index: int,
    upstream_block_uuid: str = None,
):
    """
    Creates a block run for a dynamic child block.

    Args:
        block: The dynamic child block.
        pipeline_run: The pipeline run.
        block_metadata (Dict): The metadata of the block.
        index (int): The index of the dynamic block.
        upstream_block_uuid (str, optional): The UUID of the upstream block.

    Returns:
        block_run: The created block run.

    """
    metadata = block_metadata.copy()
    metadata.update(dict(dynamic_block_index=index))

    block_uuid = dynamic_block_uuid(
        block.uuid,
        metadata,
        index,
        upstream_block_uuid=upstream_block_uuid,
    )
    block_run = pipeline_run.create_block_run(block_uuid, metrics=metadata)

    return block_run


def dynamic_block_values_and_metadata(
    block,
    execution_partition: str = None,
    block_uuid: str = None,
):
    """
    Retrieves the values and metadata of a dynamic block.

    Args:
        block: The dynamic block.
        execution_partition (str, optional): The execution partition.
        block_uuid (str, optional): The UUID of the block.

    Returns:
        Tuple: A tuple containing the values and metadata of the dynamic block.

    """
    block_uuid_original = block.uuid
    block_uuid = block_uuid_original if block_uuid is None else block_uuid

    values = []
    block_metadata = []
    output_vars = block.output_variables(execution_partition=execution_partition)
    for idx, output_name in enumerate(output_vars):
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

    return values, block_metadata


def create_block_runs_from_dynamic_block(
    block,
    pipeline_run,
    block_uuid: str = None,
) -> List:
    """
    Creates block runs for all dynamic child blocks of a dynamic block.

    Args:
        block: The dynamic block.
        pipeline_run: The pipeline run.
        block_uuid (str, optional): The UUID of the block.

    Returns:
        List: A list of all the created block runs.

    """
    block_uuid_original = block.uuid
    block_uuid = block_uuid_original if block_uuid is None else block_uuid
    execution_partition = pipeline_run.execution_partition

    values, block_metadata = dynamic_block_values_and_metadata(
        block,
        execution_partition,
        block_uuid,
    )

    # SQL blocks will return a Pandas DataFrame
    if type(values) is pd.DataFrame:
        values = values.to_dict(orient='records')

    all_block_runs = []
    # Dynamic child blocks (aka created from a dynamic block)
    for downstream_block in block.downstream_blocks:
        is_dynamic = is_dynamic_block(downstream_block)
        should_reduce = should_reduce_output(downstream_block)
        descendants = get_all_descendants(downstream_block)

        block_runs_created_by_block_uuid = {}
        dynamic_child_block_runs = []
        for idx, _ in enumerate(values):
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
                upstream_block_uuid=block_uuid,
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

                """
                If a descendant has an immediate upstream block that is different than
                the current downstream_block that reduces output, skip this loop because
                this descendant will be created by that other upstream block that reduces output
                """
                # if find(
                #     lambda x: downstream_block.uuid != x.uuid and should_reduce_output(x),
                #     b.upstream_blocks,
                # ):
                #     continue

                arr = []
                for upstream_block in b.upstream_blocks:
                    ancestors = get_all_ancestors(upstream_block)
                    # If the upstream block has the current dynamic child as an ancestor,
                    # then have this block depend on a block UUID with the dynamic UUID suffix;
                    # e.g. block_uuid:index
                    if downstream_block.uuid in [a.uuid for a in ancestors]:
                        arr.append(dynamic_block_uuid(
                            upstream_block.uuid,
                            metadata,
                            idx,
                        ))
                    elif downstream_block.uuid == upstream_block.uuid:
                        arr.append(block_run.block_uuid)
                    elif is_dynamic_block_child(upstream_block):
                        # Needs to know that the ancestors are dynamic
                        # or dynamic child without reduce
                        arr.append(dynamic_block_uuid(
                            upstream_block.uuid,
                            metadata,
                            idx,
                        ))
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
                        break

                    """
                    If any dynamic ancestors doesn't have reduce block as the descendants, skip
                    creating this downstream block.
                    """
                    dynamic_ancestor_descendants = get_all_descendants(dynamic_ancestor)

                    dynamic_ancestor_has_reduce_block = False
                    for d in dynamic_ancestor_descendants:
                        if d.uuid in ancestors_uuids:
                            if should_reduce_output(d):
                                dynamic_ancestor_has_reduce_block = True
                                break
                    if not dynamic_ancestor_has_reduce_block:
                        skip_creating_downstream = True
                        break

                    down_uuids_as_ancestors = []
                    for down in dynamic_ancestor.downstream_blocks:
                        if down.uuid in ancestors_uuids and not should_reduce_output(down):
                            down_uuids_as_ancestors.append(down.uuid)
                    skip_creating_downstream = len(down_uuids_as_ancestors) >= 2

                # Only create downstream block runs if it doesn’t have dynamically created upstream
                # blocks (aka dynamic child) that were created by a 2nd ancestor that is a dynamic
                # block
                if skip_creating_downstream:
                    continue

                for upstream_block in b.upstream_blocks:
                    if should_reduce_output(upstream_block) and \
                            upstream_block.uuid != downstream_block.uuid:
                        skip_creating_downstream = True
                        break
                """
                If an upstream block needs to be reduced but it's not the same with the current
                block that's being reduced, skip the downstream block creation.
                """
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
                    skip_if_exists=True,
                ))

    return all_block_runs


def get_all_ancestors(block) -> List:
    """
    Retrieves all ancestors of the given block.

    Args:
        block: The block.

    Returns:
        List: A list of all ancestors of the block.

    """
    arr = get_leaf_nodes(block, 'upstream_blocks', include_all_nodes=True)
    return list(filter(
        lambda x: x.uuid != block.uuid,
        arr,
    ))


def get_all_descendants(block) -> List:
    """
    Retrieves all descendants of the given block.

    Args:
        block: The block.

    Returns:
        List: A list of all descendants of the block.

    """
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
    """
    Retrieves all leaf nodes of the given block.

    Args:
        block: The block.
        attribute_key (str): The attribute key for the nodes.
        condition: A condition function to filter the nodes. (default: None)
        include_all_nodes (bool): Whether to include all nodes in the result. (default: False)

    Returns:
        List: A list of all leaf nodes of the block.

    """
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
    """
    Checks if the given block is a dynamic block.

    Args:
        block: The block.

    Returns:
        bool: True if the block is a dynamic block, False otherwise.

    """
    return block.configuration and block.configuration.get('dynamic', False)


def should_reduce_output(block) -> bool:
    """
    Checks if the given block should reduce its output.

    Args:
        block: The block.

    Returns:
        bool: True if the block should reduce its output, False otherwise.

    """
    return block.configuration and block.configuration.get('reduce_output', False)


def is_dynamic_block_child(block) -> bool:
    """
    Checks if the given block is a dynamic block child.

    Args:
        block: The block.

    Returns:
        bool: True if the block is a dynamic block child, False otherwise.

    """
    dynamic_or_child = []

    for upstream_block in block.upstream_blocks:
        if is_dynamic_block(upstream_block) or is_dynamic_block_child(upstream_block):
            dynamic_or_child.append(upstream_block)

    if len(dynamic_or_child) == 0:
        return False

    dynamic_or_child_with_reduce = list(filter(lambda x: should_reduce_output(x), dynamic_or_child))

    return len(block.upstream_blocks) > len(dynamic_or_child_with_reduce)


def output_variables(
    pipeline,
    block_uuid: str,
    execution_partition: str = None,
) -> List[str]:
    """
    Retrieves the output variables of a block.

    Args:
        pipeline: The pipeline.
        block_uuid (str): The UUID of the block.
        execution_partition (str, optional): The execution partition.

    Returns:
        List[str]: A list of output variable names.

    """
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
    """
    Checks if the given variable UUID represents an output variable.

    Args:
        variable_uuid (str): The UUID of the variable.

    Returns:
        bool: True if the variable is an output variable, False otherwise.

    """
    return variable_uuid == 'df' or variable_uuid.startswith('output')


def is_valid_print_variable(k, v, block_uuid):
    """
    Checks if the given key-value pair represents a valid print variable.

    Args:
        k: The key.
        v: The value.
        block_uuid: The UUID of the block.

    Returns:
        bool: True if the key-value pair is a valid print variable, False otherwise.

    """
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
    """
    Retrieves the input variables from the output variables of upstream blocks.

    Args:
        pipeline: The pipeline.
        upstream_block_uuids (List[str]): The UUIDs of the upstream blocks.
        execution_partition (str, optional): The execution partition.

    Returns:
        Dict[str, List[str]]: A mapping from upstream block UUID to a list of variable names.

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
) -> Tuple[List, List, List]:
    """
    Fetches the input variables for a block.

    Args:
        pipeline: The pipeline.
        upstream_block_uuids (List[str]): The UUIDs of the upstream blocks.
        input_args (List[Any]): The input arguments.
        execution_partition (str, optional): The execution partition.
        global_vars (Dict, optional): Global variables.
        dynamic_block_index (int, optional): The index of the dynamic block.
        dynamic_upstream_block_uuids (List[str], optional): The UUIDs of the dynamic upstream
            blocks.

    Returns:
        Tuple[List, List, List]: A tuple containing the input variables, kwargs variables, and
            upstream block UUIDs.

    """
    spark = (global_vars or dict()).get('spark')
    upstream_block_uuids_final = []

    kwargs_vars = []

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

                    # SQL blocks will return a Pandas DataFrame
                    if type(arr) is pd.DataFrame:
                        val = arr.iloc[index_to_use].to_dict()
                    elif type(arr) is list and len(arr) >= 1 and index_to_use < len(arr):
                        val = arr[index_to_use]

                input_vars[idx] = val

                # output_0 is the metadata for dynamic blocks
                if len(variable_values) >= 2:
                    arr = variable_values[1]
                    index_to_use = 0 if dynamic_block_index is None else dynamic_block_index
                    if type(arr) is list and len(arr) >= 1 and index_to_use < len(arr):
                        val = arr[index_to_use]
                    kwargs_vars.append(val)
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
                for upstream_block_uuid, variables in input_variables_by_uuid.items():
                    end_idx = 1 if upstream_is_dynamic else len(variables)
                    for var in variables[:end_idx]:
                        variable_values = pipeline.variable_manager.get_variable(
                            pipeline.uuid,
                            upstream_block_uuid,
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

                    # output_0 is the metadata for dynamic blocks
                    if dynamic_block_index is not None and \
                            upstream_is_dynamic and \
                            len(variables) >= 2:

                        var = variables[1]
                        variable_values = pipeline.variable_manager.get_variable(
                            pipeline.uuid,
                            upstream_block_uuid,
                            var,
                            partition=execution_partition,
                            spark=spark,
                        )
                        if dynamic_block_index < len(variable_values):
                            val = variable_values[dynamic_block_index]
                            kwargs_vars.append(val)

                if len(final_value) >= 1 and all([type(v) is pd.DataFrame for v in final_value]):
                    final_value = pd.concat(final_value)

                if not should_reduce:
                    # Only get the 1st output of a dynamic block;
                    # the 2nd output is the dynamic child block’s metadata
                    if upstream_is_dynamic and dynamic_block_index is not None:
                        # SQL blocks will return a Pandas DataFrame
                        if type(final_value) is pd.DataFrame:
                            final_value = final_value.iloc[dynamic_block_index].to_dict()
                        else:
                            final_value = final_value[dynamic_block_index]

                    if type(final_value) is not pd.DataFrame and \
                        type(final_value) is list and \
                            len(final_value) == 1:
                        final_value = final_value[0]

                input_vars[idx] = final_value

    return input_vars, kwargs_vars, upstream_block_uuids_final
