import asyncio
import os
from typing import Any, Callable, Dict, List, Tuple, Union

import pandas as pd

from mage_ai.data_preparation.models.variable import Variable
from mage_ai.shared.strings import to_ordinal_integers


def get_dynamic_child_block_indexes(
    block,
    execution_partition: str = None,
) -> List[int]:
    from mage_ai.data_preparation.models.block.dynamic.utils import (
        build_combinations_for_dynamic_child,
    )

    """
    Get all the folder names in the dynamic child block’s variables directory:
        0/
        1/
        2/
    """
    count = len(build_combinations_for_dynamic_child(
        block,
        execution_partition=execution_partition,
    ))

    return [i for i in range(count)]


def get_variable_objects(
    block,
    execution_partition: str = None,
    dynamic_block_index: int = None,
) -> List[Variable]:
    """
    If dynamic_block_index, get the folder names in the nested folder named after the
    dynamic_block_index (e.g. 0):
        0/
            output_0/
            output_1/

    Or else:
        output_0/
        output_1/
    """
    pipeline = block.pipeline
    pipeline_uuid = pipeline.uuid
    variable_manager = pipeline.variable_manager

    """
    If block is a dynamic child block, get the variable objects specifically in the directory
    named after the dynamic_block_index:
        0/
            output_0/
    """
    block_uuid = block.uuid
    if dynamic_block_index is not None:
        block_uuid = os.path.join(block_uuid, str(dynamic_block_index))

    variable_uuids = variable_manager.get_variables_by_block(
        block.pipeline.uuid,
        block_uuid=block_uuid,
        clean_block_uuid=dynamic_block_index is None,
        partition=execution_partition,
    )

    def __sort(variable_object: str):
        if not variable_object:
            return -96, -96
        return to_ordinal_integers(variable_object.block_dir_name)[0], variable_object.uuid

    return sorted(
        [variable_manager.get_variable_object(
            block_uuid=block_uuid,
            clean_block_uuid=dynamic_block_index is None,
            partition=execution_partition,
            pipeline_uuid=pipeline_uuid,
            variable_uuid=variable_uuid,
        ) for variable_uuid in variable_uuids if variable_uuid != ''],
        key=__sort,
    )


def delete_variable_objects_for_dynamic_child(
    block,
    dynamic_block_index: int = None,
    execution_partition: str = None,
) -> None:
    variable_objects = get_variable_objects(
        block,
        dynamic_block_index=dynamic_block_index,
        execution_partition=execution_partition,
    )
    if variable_objects:
        for variable_object in variable_objects:
            variable_object.delete()


def __get_all_variable_objects_for_dynamic_child(
    block,
    execution_partition: str = None,
) -> List[List[Variable]]:
    """
    This method will get the nested outputs (output_0) in every numeric folder
    named after the dynamic_block_index (e.g. 0/).
    """
    variable_objects_arr = []

    indexes = get_dynamic_child_block_indexes(block, execution_partition=execution_partition)
    for dynamic_block_index in indexes:
        # 0/output_0,
        # 0/output_1,
        # 0/output_2,

        # get_variable_objects returns a list of outputs (e.g. [output_0, output_1, output_2])
        arr = get_variable_objects(
            block,
            execution_partition=execution_partition,
            dynamic_block_index=dynamic_block_index,
        )

        def __sort(variable_object: str):
            if not variable_object:
                return -96, -96
            return to_ordinal_integers(variable_object.block_dir_name)[0], variable_object.uuid

        variable_objects_arr.append(sorted(arr, key=__sort))

    return variable_objects_arr


async def get_outputs_async(
    block,
    execution_partition: str = None,
    dynamic_block_index: int = None,
    sample: bool = False,
    sample_count: int = None,
) -> Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]:
    variable_objects = get_variable_objects(
        block,
        execution_partition=execution_partition,
        dynamic_block_index=dynamic_block_index,
    )

    return await asyncio.gather(*[variable_object.read_data_async(
        sample=sample,
        sample_count=sample_count,
    ) for variable_object in variable_objects])


def get_outputs(
    block,
    execution_partition: str = None,
    dynamic_block_index: int = None,
    sample: bool = False,
    sample_count: int = None,
) -> Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]:
    variable_objects = get_variable_objects(
        block,
        execution_partition=execution_partition,
        dynamic_block_index=dynamic_block_index,
    )

    return [variable_object.read_data(
        sample=sample,
        sample_count=sample_count,
    ) for variable_object in variable_objects]


def get_outputs_for_dynamic_block(
    block,
    **kwargs
) -> Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]:
    values = get_outputs(block, **kwargs)

    if len(values) >= 2:
        return values[0], values[1]
    elif len(values) >= 1:
        return values[0], None

    return None, None


async def get_outputs_for_dynamic_block_async(
    block,
    **kwargs
) -> Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]:
    values = await get_outputs_async(block, **kwargs)

    if len(values) >= 2:
        return values[0], values[1]
    elif len(values) >= 1:
        return values[0], None

    return None, None


def __preprocess_and_postprocess_dynamic_child_outputs(
    block,
    map_outputs: Callable,
    execution_partition: str = None,
):
    from mage_ai.data_preparation.models.block.dynamic.utils import is_dynamic_block
    is_dynamic = is_dynamic_block(block)

    variable_objects_arr = __get_all_variable_objects_for_dynamic_child(
        block,
        execution_partition=execution_partition,
    )
    variable_objects_arr = map_outputs(variable_objects_arr)

    for idx, arr in enumerate(variable_objects_arr):
        for idx2, variable_object in enumerate(arr):
            print(idx, idx2, variable_object)

    if is_dynamic:
        return variable_objects_arr

    return [arr[0] if len(arr) == 1 else arr for arr in variable_objects_arr]


def get_outputs_for_dynamic_child(
    block,
    execution_partition: str = None,
    sample: bool = False,
    sample_count: int = None,
) -> List[Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]]:
    def __map_outputs(outputs, sample=sample, sample_count=sample_count):
        return [[var_obj.read_data(
            sample=sample,
            sample_count=sample_count,
        ) for var_obj in arr] for arr in outputs]

    return __preprocess_and_postprocess_dynamic_child_outputs(
        block,
        execution_partition=execution_partition,
        map_outputs=__map_outputs,
    )


async def get_outputs_for_dynamic_child_async(
    block,
    execution_partition: str = None,
    sample: bool = False,
    sample_count: int = None,
) -> List[Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]]:
    async def __map_outputs(outputs, sample=sample, sample_count=sample_count):
        async def __read_pair(arr: List[Variable], sample=sample, sample_count=sample_count):
            return await asyncio.gather(*[variable_object.read_data_async(
                sample=sample,
                sample_count=sample_count,
            ) for variable_object in arr])

        return await asyncio.gather(*[__read_pair(arr) for arr in outputs])

    return __preprocess_and_postprocess_dynamic_child_outputs(
        block,
        execution_partition=execution_partition,
        map_outputs=lambda outputs: asyncio.run(__map_outputs(outputs)),
    )


def fetch_input_variables_for_dynamic_upstream_blocks(
    block,
    input_args: List[Any] = None,
    dynamic_block_index: int = None,
    execution_partition: str = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    **kwargs,
) -> Tuple[List, List, List]:
    from mage_ai.data_preparation.models.block.dynamic.utils import (
        is_dynamic_block,
        is_dynamic_block_child,
        should_reduce_output,
    )

    input_vars = []
    kwargs_vars = []
    upstream_block_uuids = []

    for upstream_block in block.upstream_blocks:
        is_dynamic_child = is_dynamic_block_child(upstream_block)
        is_dynamic = is_dynamic_block(upstream_block)
        reduce_output = should_reduce_output(upstream_block)

        upstream_block_uuid = upstream_block.uuid

        # If an upstream block has all 3, then retrieve the input data as if you’re fetching
        # from an upstream dynamic block
        if is_dynamic_child and (not is_dynamic or not reduce_output):
            var_objs_arr = get_outputs_for_dynamic_child(
                upstream_block,
                execution_partition=execution_partition,
            )

            # If dynamic child should reduce its output (which means it passes the entire
            # output to its downstream blocks):
            if should_reduce_output(upstream_block):
                input_vars.append(var_objs_arr)
                kwargs_vars.append({})
            else:
                # If is dynamic, the modulus denominator is factored by the number of dynamic
                # children and the number of actual outputs from the dynamic block

                if is_dynamic:
                    # The first index is used to select which dynamic child to get data from
                    # the 2nd index is used to determine which value from the dynamic list to
                    # fetch as the input variable.
                    index1 = dynamic_block_index % len(var_objs_arr)

                    child_datas = []
                    metadatas = {}
                    pair = var_objs_arr[index1]
                    if len(pair) >= 1:
                        child_datas = pair[0]
                        if len(pair) >= 2:
                            metadatas = pair[1]

                    index2 = dynamic_block_index % len(child_datas)
                    child_data = child_datas[index2]
                    metadata = metadatas[index2] if index2 < len(metadatas) else {}
                    input_vars.append(child_data)
                    kwargs_vars.append(metadata)
                else:
                    index = dynamic_block_index % len(var_objs_arr)
                    arr = var_objs_arr[index]
                    input_vars.append(arr)
                    kwargs_vars.append({})
        elif is_dynamic:
            child_data, metadata = get_outputs_for_dynamic_block(
                upstream_block,
                execution_partition=execution_partition,
            )
            index = dynamic_block_index % len(child_data)

            if isinstance(child_data, list):
                input_vars.append(child_data[index])
            elif isinstance(child_data, pd.DataFrame):
                input_vars.append(child_data.iloc[index])
            elif isinstance(child_data, dict):
                input_vars.append(child_data.get(index))

            if metadata and index < len(metadata):
                kwargs_vars.append(metadata[index])
        else:
            from mage_ai.data_preparation.models.block.utils import (
                fetch_input_variables,
            )

            ir, kr, up = fetch_input_variables(
                block.pipeline,
                [upstream_block_uuid],
                input_args,
                execution_partition=execution_partition,
                from_notebook=from_notebook,
                global_vars=global_vars,
                **kwargs,
            )

            input_vars.append(ir[0])
            kwargs_vars.append(kr[0])
            upstream_block_uuids.append(up[0])

    return input_vars, kwargs_vars, upstream_block_uuids
