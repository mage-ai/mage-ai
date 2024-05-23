from __future__ import annotations

import asyncio
import os
from collections.abc import Sequence
from logging import Logger
from typing import Any, Dict, List, Optional, Tuple, Union

import pandas as pd

from mage_ai.data.models.outputs.models import BlockOutput
from mage_ai.data.models.outputs.query import BlockOutputQuery, DynamicBlockOutputQuery
from mage_ai.data_preparation.models.block.dynamic.models import (
    LazyVariableController,
    LazyVariableSet,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.shared.strings import to_ordinal_integers


def __get_dynamic_child_block_indexes(
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
    count = len(
        build_combinations_for_dynamic_child(
            block,
            execution_partition=execution_partition,
        )
    )

    return [i for i in range(count)]


def delete_variable_objects_for_dynamic_child(
    block,
    dynamic_block_index: Optional[int] = None,
    execution_partition: Optional[str] = None,
) -> None:
    """
    Used by:
        block.store_variables
    """
    output_query = DynamicBlockOutputQuery(block=block)
    block_outputs = output_query.fetch(dynamic_block_index, partition=execution_partition)
    if block_outputs:
        for output in block_outputs:
            output.variable.delete()


async def __get_outputs_async(
    block,
    execution_partition: Optional[str] = None,
    dynamic_block_index: Optional[int] = None,
    sample: bool = False,
    sample_count: Optional[int] = None,
) -> List[Optional[Union[Dict, int, str, pd.DataFrame, Any]]]:
    variable_objects = get_variable_objects(
        block,
        execution_partition=execution_partition,
        dynamic_block_index=dynamic_block_index,
    )

    return await asyncio.gather(*[
        variable_object.read_data_async(
            sample=sample,
            sample_count=sample_count,
        )
        for variable_object in variable_objects
    ])


def __get_outputs(
    block,
    execution_partition: str = None,
    dynamic_block_index: int = None,
    sample: bool = False,
    sample_count: int = None,
) -> List[Optional[Union[Dict, int, str, pd.DataFrame, Any]]]:
    variable_objects = get_variable_objects(
        block,
        execution_partition=execution_partition,
        dynamic_block_index=dynamic_block_index,
    )

    return [
        variable_object.read_data(
            sample=sample,
            sample_count=sample_count,
        )
        for variable_object in variable_objects
    ]


def get_outputs_for_dynamic_block(
    block, **kwargs
) -> List[Optional[Union[Dict, int, str, pd.DataFrame, Any]]]:
    """
    mage_ai/data_preparation/models/block/dynamic/child.py
    mage_ai/data_preparation/models/block/dynamic/utils.py
    block.__get_outputs_async (old)
    """
    values = __get_outputs(block, **kwargs)

    if BlockLanguage.SQL == block.language:
        return [values[0] if len(values) == 1 else values, None]

    if len(values) >= 2:
        return values[0], values[1]
    elif len(values) >= 1:
        return [values[0], None]

    return [None, None]


async def get_outputs_for_dynamic_block_async(
    block, **kwargs
) -> List[Optional[Union[Dict, int, str, pd.DataFrame, Any]]]:
    """
    block.__get_outputs_async (old)
    """
    values = await __get_outputs_async(block, **kwargs)

    if BlockLanguage.SQL == block.language:
        return values[0] if len(values) == 1 else values, None

    if len(values) >= 2:
        return values[0], values[1]
    elif len(values) >= 1:
        return values[0], None

    return None, None


def get_outputs_for_dynamic_child(
    block,
    execution_partition: Optional[str] = None,
    logger: Optional[Logger] = None,
    logging_tags: Optional[Dict] = None,
    sample: bool = False,
    sample_count: Optional[int] = None,
) -> List[Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]]:
    """
    mage_ai/data_preparation/models/block/dynamic/child.py
    block.get_outputs (old)
    block.__get_outputs_async (old)
    """
    # List[List[Variable]]
    list_of_lists_of_variables = __get_all_variable_objects_for_dynamic_child(
        block,
        execution_partition=execution_partition,
    )

    # List[List[LazyVariableSet]]
    lazy_variables_sets = [
        LazyVariableSet(
            block,
            variable_objects,
            logger=logger,
            logging_tags=logging_tags,
            sample=sample,
            sample_count=sample_count,
        )
        for variable_objects in list_of_lists_of_variables
    ]

    return LazyVariableController(block, lazy_variables_sets)


def fetch_input_variables_for_dynamic_upstream_blocks(
    block,
    input_args: List[Any] = None,
    dynamic_block_index: int = None,
    execution_partition: str = None,
    from_notebook: bool = False,
    global_vars: Dict = None,
    **kwargs,
) -> Tuple[List, List, List]:
    """
    block.fetch_input_variables
    block.interpolate_content
    """
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
            lazy_variable_controller = get_outputs_for_dynamic_child(
                upstream_block,
                execution_partition=execution_partition,
            )

            # If dynamic child should reduce its output (which means it passes the entire
            # output to its downstream blocks):
            if should_reduce_output(upstream_block) and block.type != BlockType.EXTENSION:
                child_data = []
                metadata = {}
                for lazy_variable_set in lazy_variable_controller:
                    child_data.append(lazy_variable_set.read_child_data())
                    metadata.update(lazy_variable_set.read_metadata() or {})
                input_vars.append(child_data)
                kwargs_vars.append(metadata)
            else:
                # If is dynamic, the modulus denominator is factored by the number of dynamic
                # children and the number of actual outputs from the dynamic block

                # The first index is used to select which dynamic child to get data from
                # the 2nd index is used to determine which value from the dynamic list to
                # fetch as the input variable.
                pair = lazy_variable_controller.render(
                    child_dynamic_block_index=dynamic_block_index,
                )
                child_data, metadata = pair
                input_vars.append(child_data)
                kwargs_vars.append(metadata)
        elif is_dynamic:
            child_data, metadata = get_outputs_for_dynamic_block(
                upstream_block,
                execution_partition=execution_partition,
            )
            index = dynamic_block_index % len(child_data)

            if isinstance(child_data, list):
                input_vars.append(child_data[index])
            elif isinstance(child_data, pd.DataFrame):
                row = child_data.iloc[index]
                input_vars.append(row.to_dict() if row is not None else row)
            elif isinstance(child_data, dict):
                input_vars.append(child_data.get(index))

            if metadata and index < len(metadata):
                if isinstance(metadata, list):
                    kwargs_vars.append(metadata[index])
                elif isinstance(metadata, dict):
                    kwargs_vars.append(metadata)
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
            kwargs_vars.append(kr[0] if len(kr) > 0 else None)
            upstream_block_uuids.append(up[0])

    return input_vars, kwargs_vars, upstream_block_uuids
