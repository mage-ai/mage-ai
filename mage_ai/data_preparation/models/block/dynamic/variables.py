import asyncio
import os
from typing import Any, Dict, List, Tuple, Union

import pandas as pd

from mage_ai.data_preparation.models.variable import Variable


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

    variable_manager = block.pipeline.variable_manager
    variable_uuids = variable_manager.get_variables_by_block(
        block.pipeline.uuid,
        block_uuid=block.uuid,
        clean_block_uuid=True,
        partition=execution_partition,
    )

    return sorted([int(uuid) for uuid in variable_uuids if uuid.isnumeric() and int(uuid) < count])


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

    return sorted(
        [variable_manager.get_variable_object(
            block_uuid=block_uuid,
            clean_block_uuid=dynamic_block_index is None,
            partition=execution_partition,
            pipeline_uuid=pipeline_uuid,
            variable_uuid=variable_uuid,
        ) for variable_uuid in variable_uuids if variable_uuid != ''],
        key=lambda variable: (variable.block_dir_name, variable.uuid),
    )


def get_variable_objects_for_dynamic_child(
    block,
    execution_partition: str = None,
) -> List[Tuple[Variable, Variable]]:
    """
    To get all the variable objects for a dynamic child block, don’t include the
    dynamic_block_index in the kwargs.

    If dynamic_block_index is included, then only the variable objects for that specific
    child is retrieved.
    """
    variable_object_pairs = []

    indexes = get_dynamic_child_block_indexes(block, execution_partition=execution_partition)
    for dynamic_block_index in indexes:
        variable_object_pairs.append(get_variable_objects(
            block,
            execution_partition=execution_partition,
            dynamic_block_index=dynamic_block_index,
        ))

    return sorted(
        variable_object_pairs,
        key=lambda pairs: (pairs[0].block_dir_name, pairs[0].uuid),
    )


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


def get_outputs_for_dynamic_child(
    block,
    execution_partition: str = None,
    sample: bool = False,
    sample_count: int = None,
) -> List[Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]]:
    variable_object_pairs = get_variable_objects_for_dynamic_child(
        block,
        execution_partition=execution_partition,
    )

    return [tuple([variable_object.read_data(
        sample=sample,
        sample_count=sample_count,
    ) for variable_object in pair]) for pair in variable_object_pairs]


async def get_outputs_for_dynamic_child_async(
    block,
    execution_partition: str = None,
    sample: bool = False,
    sample_count: int = None,
) -> List[Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]]:
    variable_object_pairs = get_variable_objects_for_dynamic_child(
        block,
        execution_partition=execution_partition,
    )

    async def __read_pair(pair: Tuple[Variable, Variable]):
        arr = await asyncio.gather(*[variable_object.read_data_async(
            sample=sample,
            sample_count=sample_count,
        ) for variable_object in pair])

        return tuple(arr)

    return await asyncio.gather(*[__read_pair(pair) for pair in variable_object_pairs])


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

        upstream_block_uuid = upstream_block.uuid

        if is_dynamic_child:
            pairs = get_outputs_for_dynamic_child(
                upstream_block,
                execution_partition=execution_partition,
            )

            if should_reduce_output(upstream_block):
                child_data = []
                metadata = {}
                for pair in pairs:
                    if len(pair) >= 1:
                        child_data.append(pair[0])
                        if len(pair) >= 2:
                            metadata_inner = pair[1]
                            if metadata_inner and \
                                    isinstance(metadata, dict) and \
                                    isinstance(metadata_inner, dict):

                                metadata.update(metadata_inner)

                input_vars.append(child_data)
                kwargs_vars.append(metadata)
            else:
                index = dynamic_block_index % len(pairs)
                pair = pairs[index]
                child_data = pair[0]
                metadata = pair[1] if len(pair) >= 2 else None

                if is_dynamic:
                    index = dynamic_block_index % len(child_data)
                    child_data = child_data[index]
                    metadata = metadata[index] if metadata and index < len(metadata) else None

                input_vars.append(child_data)
                if metadata:
                    kwargs_vars.append(metadata)
        elif is_dynamic:
            child_data, metadata = get_outputs_for_dynamic_block(
                upstream_block,
                execution_partition=execution_partition,
            )
            index = dynamic_block_index % len(child_data)

            input_vars.append(child_data[index])
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
