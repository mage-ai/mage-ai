from __future__ import annotations

import asyncio
import os
import re
from collections.abc import Sequence
from logging import Logger
from typing import Any, Dict, List, Optional, Tuple, Union

import pandas as pd
import polars as pl

from mage_ai.data.constants import InputDataType
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data_preparation.models.block.dynamic.data import (
    calculate_dynamic_index_data_index,
)
from mage_ai.data_preparation.models.block.settings.variables.models import (
    ChunkKeyTypeUnion,
)
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.data_preparation.models.variables.utils import (
    get_first_data_output_variable,
)
from mage_ai.io.base import ExportWritePolicy
from mage_ai.settings.server import DEBUG_MEMORY, MEMORY_MANAGER_V2
from mage_ai.shared.environments import is_debug, is_test
from mage_ai.shared.strings import to_ordinal_integers
from mage_ai.system.memory.wrappers import execute_with_memory_tracking


class LazyVariable:
    def __init__(
        self,
        block,
        variable: Variable,
        sample: Optional[int] = None,
        sample_count: Optional[int] = None,
        skip: bool = False,
    ):
        self.block = block
        self.sample = sample
        self.sample_count = sample_count
        self.variable = variable

    @property
    def is_dynamic(self):
        from mage_ai.data_preparation.models.block.dynamic.utils import is_dynamic_block

        return (self.block.is_dynamic_v2 and self.block.is_dynamic_parent) or is_dynamic_block(
            self.block
        )

    def read_data(self):
        result = self.variable.read_data(
            sample=self.sample,
            sample_count=self.sample_count,
        )

        if self.is_dynamic:
            return result

        if isinstance(result, list) or isinstance(result, tuple):
            if len(result) == 1:
                return result[0]

        return result

    async def read_data_async(self):
        result = await self.variable.read_data_async(
            sample=self.sample,
            sample_count=self.sample_count,
        )

        if self.is_dynamic:
            return result

        if isinstance(result, list) or isinstance(result, tuple):
            if len(result) == 1:
                return result[0]

        return result


class LazyVariableSet(Sequence):
    def __init__(
        self,
        block,
        variable_objects: List[Variable],
        logger: Logger = None,
        logging_tags: Dict = None,
        **kwargs,
    ):
        self.block = block
        self.lazy_variables = [
            LazyVariable(
                block,
                variable_object,
                **kwargs,
            )
            for variable_object in variable_objects
        ]
        self.logger = logger
        self.logging_tags = logging_tags

    def __getitem__(self, index: int):
        if index >= len(self.lazy_variables):
            return {}
        return self.lazy_variables[index]

    def __iter__(self):
        for lazy_variable in self.lazy_variables:
            yield lazy_variable

    def __len__(self):
        return len(self.lazy_variables)

    @property
    def is_dynamic(self):
        from mage_ai.data_preparation.models.block.dynamic.utils import is_dynamic_block

        return (self.block.is_dynamic_v2 and self.block.is_dynamic_parent) or is_dynamic_block(
            self.block
        )

    @property
    def lazy_child_data(self) -> Union[List[LazyVariable], LazyVariable]:
        if len(self) == 1:
            return self[0]

        return self.lazy_variables

    @property
    def lazy_metadata(self) -> Optional[LazyVariable]:
        if len(self) == 2:
            return self[1]

        return None

    def read_child_data(self) -> Any:
        if not isinstance(self.lazy_child_data, pd.DataFrame) and not self.lazy_child_data:
            return None

        if isinstance(self.lazy_child_data, list):
            return [self.read_lazy_variable(data) for data in self.lazy_child_data]

        return (
            self.read_lazy_variable(self.lazy_child_data)
            if self.lazy_child_data is not None
            else None
        )

    def read_metadata(self) -> Any:
        return self.read_lazy_variable(self.lazy_metadata) if self.lazy_metadata else {}

    def read_lazy_variable(self, lazy_variable: LazyVariable) -> Any:
        return lazy_variable.read_data()

    async def read_lazy_variable_async(
        self,
        lazy_variable: Union[List[LazyVariable], LazyVariable],
    ) -> Any:
        if isinstance(lazy_variable, list):
            return await asyncio.gather(*[lv.read_data_async() for lv in lazy_variable])
        elif lazy_variable:
            return await lazy_variable.read_data_async()

    def read_data(self) -> Tuple[Any, Any]:
        metadata = self.read_metadata()
        if metadata is None:
            metadata = {}
        return (
            self.read_child_data(),
            metadata,
        )

    async def read_data_async(self) -> Tuple[Optional[Any], Dict]:
        pair = tuple()
        if self.lazy_child_data:
            pair += (await self.read_lazy_variable_async(self.lazy_child_data),)
        else:
            pair += (None,)

        if self.lazy_metadata:
            pair += (await self.read_lazy_variable_async(self.lazy_metadata),)
        else:
            pair += ({},)

        return pair


class LazyVariableController(Sequence):
    def __init__(self, block, lazy_variable_sets: List[LazyVariableSet]):
        self.block = block
        self.lazy_variable_sets = lazy_variable_sets

    def __getitem__(self, index: int):
        return self.lazy_variable_sets[index]

    def __iter__(self):
        for lazy_variable_set in self.lazy_variable_sets:
            yield lazy_variable_set

    def __len__(self):
        return len(self.lazy_variable_sets)

    @property
    def is_dynamic(self):
        from mage_ai.data_preparation.models.block.dynamic.utils import is_dynamic_block

        return (self.block.is_dynamic_v2 and self.block.is_dynamic_parent) or is_dynamic_block(
            self.block
        )

    def render(
        self,
        child_dynamic_block_index: Optional[int] = None,
        dynamic_block_index: Optional[int] = None,
        lazy_load: bool = False,
    ) -> List[Union[Tuple[Optional[Any], Dict], List[LazyVariableSet]]]:
        arr = self.lazy_variable_sets

        if child_dynamic_block_index is not None:
            index = child_dynamic_block_index % len(self)
            lazy_variable_set = arr[index]
            child_data, metadata = lazy_variable_set.read_data()

            if self.is_dynamic:
                if child_data is None:
                    child_data = [None]
                elif isinstance(child_data, pd.DataFrame):
                    index = child_dynamic_block_index % len(child_data.index)
                    child_data = child_data.iloc[index : index + 1]
                else:
                    index = child_dynamic_block_index % len(child_data)
                    child_data = child_data[index]
                metadata = metadata[index] if len(metadata) > index else {}

            return [child_data, metadata]

        if dynamic_block_index is not None:
            arr = arr[dynamic_block_index : dynamic_block_index + 1]

        if lazy_load:
            return arr

        return [lazy_variable_set.read_data() for lazy_variable_set in arr]

    async def render_async(
        self,
        dynamic_block_index: Optional[int] = None,
        lazy_load: bool = False,
    ) -> List[Union[Tuple[Optional[Any], Dict], List[LazyVariableSet]]]:
        arr = self.lazy_variable_sets

        if dynamic_block_index is not None:
            arr = arr[dynamic_block_index : dynamic_block_index + 1]

        if lazy_load:
            return arr

        return await asyncio.gather(
            *[lazy_variable_set.read_data_async() for lazy_variable_set in arr],
        )


def get_dynamic_child_block_indexes(
    block,
    execution_partition: Optional[str] = None,
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
    combos = build_combinations_for_dynamic_child(
        block,
        execution_partition=execution_partition,
    )
    count = len(combos)

    return [i for i in range(count)]


def sort_variables(variable_object):
    # Using regular expressions to find all digits in the directory path
    numbers = []
    for text in [
        str(variable_object.block_dir_name),
        str(variable_object.uuid),
    ]:
        number = re.findall('\\d+', text)
        if number:
            numbers += number
        else:
            numbers.append(to_ordinal_integers(text)[0])
    # Convert found strings to integers for correct numeric sort
    return tuple(map(int, numbers))


def get_variable_objects(
    block: Any,
    execution_partition: Optional[str] = None,
    dynamic_block_index: Optional[int] = None,
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

    Or
        output_0/
            0/
            1/
        output_1/
            0/
            1/
    """

    """
    If block is a dynamic child block, get the variable objects specifically in the directory
    named after the dynamic_block_index:
        0/
            output_0/
    """
    block_uuid = block.uuid
    if dynamic_block_index is not None:
        block_uuid = os.path.join(block_uuid, str(dynamic_block_index))

    variable_uuids = block.get_variables_by_block(
        block_uuid,
        clean_block_uuid=dynamic_block_index is None,
        partition=execution_partition,
    )

    return sorted(
        [
            block.get_variable_object(
                block_uuid,
                variable_uuid,
                clean_block_uuid=dynamic_block_index is None,
                ordinal_position=int(dynamic_block_index)
                if dynamic_block_index is not None
                else None,
                partition=execution_partition,
            )
            for variable_uuid in variable_uuids
            if variable_uuid != ''
        ],
        key=sort_variables,
    )


def delete_variable_objects_for_dynamic_child(
    block,
    dynamic_block_index: Optional[int] = None,
    execution_partition: Optional[str] = None,
) -> None:
    variable_objects = get_variable_objects(
        block,
        dynamic_block_index=dynamic_block_index,
        execution_partition=execution_partition,
    )
    if variable_objects:
        write_policy = (
            block.write_settings.batch_settings.mode
            if block.write_settings and block.write_settings.batch_settings
            else None
        )
        for variable_object in variable_objects:
            if write_policy and variable_object.data_exists():
                if ExportWritePolicy.FAIL == write_policy:
                    raise Exception(f'Write policy for block {block.uuid} is {write_policy}.')
                elif ExportWritePolicy.APPEND != write_policy:
                    variable_object.delete()


def __get_all_variable_objects_for_dynamic_child(
    block,
    execution_partition: Optional[str] = None,
    limit_parts: Optional[int] = None,
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

        variable_objects_arr.append(sorted(arr, key=sort_variables))

    if limit_parts is not None:
        variable_objects_arr = variable_objects_arr[:limit_parts]

    return variable_objects_arr


async def get_outputs_async(
    block,
    execution_partition: Optional[str] = None,
    dynamic_block_index: Optional[int] = None,
    limit_parts: Optional[int] = None,
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
            limit_parts=limit_parts,
            sample=sample,
            sample_count=sample_count,
        )
        for variable_object in variable_objects
    ])


def get_outputs(
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


def __get_first_data_output_variable(
    block: Any,
    execution_partition: Optional[str] = None,
    dynamic_block_index: Optional[int] = None,
):
    variable_objects = get_variable_objects(
        block,
        execution_partition=execution_partition,
        dynamic_block_index=dynamic_block_index,
    )
    return get_first_data_output_variable(variable_objects)


def get_dynamic_children_count(
    block: Any,
    dynamic_block_index: Optional[int] = None,
    execution_partition: Optional[str] = None,
    variable_uuid: Optional[str] = None,
) -> Tuple[Optional[int], bool]:
    output_variable = __get_first_data_output_variable(
        block, execution_partition=execution_partition, dynamic_block_index=dynamic_block_index
    )
    if output_variable:
        return output_variable.items_count(), output_variable.is_partial_data_readable()

    return None, False


def get_partial_dynamic_block_outputs(
    block: Any,
    index: int,
    batch_settings: Optional[BatchSettings] = None,
    chunks: Optional[List[ChunkKeyTypeUnion]] = None,
    dynamic_block_index: Optional[int] = None,
    execution_partition: Optional[str] = None,
    input_data_types: Optional[List[InputDataType]] = None,
) -> Tuple[Optional[Any], Optional[Dict[str, Any]]]:
    output_variable = __get_first_data_output_variable(
        block, execution_partition=execution_partition, dynamic_block_index=dynamic_block_index
    )
    result = None
    if output_variable and output_variable.is_partial_data_readable():
        result = block.read_partial_data(
            output_variable.uuid,
            batch_settings=batch_settings,
            chunks=chunks,
            partition=execution_partition,
            input_data_types=input_data_types,
            part_uuid=int(index),
        )

    return result, None


def get_outputs_for_dynamic_block(
    block, origin_block: Optional[Any] = None, **kwargs
) -> List[Optional[Union[Dict, int, str, pd.DataFrame, Any]]]:
    def func():
        values = get_outputs(block, **kwargs)

        if BlockLanguage.SQL == block.language:
            return [values[0] if len(values) == 1 else values, None]

        if len(values) >= 2:
            return values[0], values[1]
        elif len(values) >= 1:
            return [values[0], None]

        return [None, None]

    if DEBUG_MEMORY:
        result, _ = execute_with_memory_tracking(
            func,
            log_message_prefix=f'[{(origin_block or block).uuid}:get_outputs_for_dynamic_block]',
        )

        return result

    return func()


async def get_outputs_for_dynamic_block_async(
    block, **kwargs
) -> List[Optional[Union[Dict, int, str, pd.DataFrame, Any]]]:
    values = await get_outputs_async(block, **kwargs)

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
    limit_parts: Optional[int] = None,
    logger: Optional[Logger] = None,
    logging_tags: Optional[Dict] = None,
    sample: bool = False,
    sample_count: Optional[int] = None,
) -> Union[
    LazyVariableController, List[Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]]
]:
    def func():
        # List[List[Variable]]
        list_of_lists_of_variables = __get_all_variable_objects_for_dynamic_child(
            block,
            execution_partition=execution_partition,
            limit_parts=limit_parts,
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

    result, _ = execute_with_memory_tracking(
        func,
        log_message_prefix=f'[{block.uuid}:get_outputs_for_dynamic_child]',
    )

    return result


def dynamic_upstream_block_item_counts(block, partition: Optional[str] = None) -> List[int]:
    from mage_ai.data_preparation.models.block.dynamic.counter import DynamicItemCounter
    from mage_ai.data_preparation.models.block.dynamic.utils import (
        is_dynamic_block,
        is_dynamic_block_child,
    )

    return [
        DynamicItemCounter.build_counter(
            b, downstream_block=block, partition=partition
        ).item_count()
        for b in block.upstream_blocks
        if (b.is_dynamic_v2 and (b.should_dynamically_generate_block(block) or b.is_dynamic_child))
        or (is_dynamic_block(b) or is_dynamic_block_child(b))
    ]


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
    dynamic_upstream_item_counts = dynamic_upstream_block_item_counts(
        block, partition=execution_partition
    )

    for upstream_position_index, upstream_block in enumerate(block.upstream_blocks):
        if block.is_dynamic_v2:
            is_dynamic_child = upstream_block.is_dynamic_child
            is_dynamic = upstream_block.should_dynamically_generate_block(block)
            reduce_output = upstream_block.should_reduce_output_for_downstream_block(
                block
            ) or block.should_reduce_output_from_upstream_block(upstream_block)
        else:
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
            if reduce_output and block.type != BlockType.EXTENSION:
                child_data = []
                metadata = {}

                for lazy_set in lazy_variable_controller:
                    if isinstance(lazy_set, LazyVariableSet):
                        lz_data = lazy_set.read_child_data()
                        md_data = lazy_set.read_metadata()

                        if isinstance(lz_data, list) and not md_data:
                            child_data += lz_data
                        else:
                            child_data.append(lz_data)
                            metadata.update(md_data)

                        if is_debug() or is_test():
                            print(
                                '[fetch_input_variables_for_dynamic_upstream_blocks.reduce_output] '
                                f'upstream:{upstream_block.uuid}: -> '
                                f'{block.uuid}:{dynamic_block_index}: '
                                f'upstream_position_index:{upstream_position_index}, '
                                f'output: {lz_data}, '
                                f'kwargs: {md_data}'
                            )

                if is_debug() or is_test():
                    print(
                        '[fetch_input_variables_for_dynamic_upstream_blocks.reduce_output] '
                        f'upstream:{upstream_block.uuid} -> {block.uuid}:{dynamic_block_index}: '
                        f'upstream_position_index:{upstream_position_index}, '
                        f'output -> reduced: {child_data}, '
                        f'kwargs -> reduced: {metadata}'
                    )

                input_vars.append(child_data)
                kwargs_vars.append(metadata)
            else:
                # If is dynamic, the modulus denominator is factored by the number of dynamic
                # children and the number of actual outputs from the dynamic block

                # The first index is used to select which dynamic child to get data from
                # the 2nd index is used to determine which value from the dynamic list to
                # fetch as the input variable.
                child_data = None
                metadata = None

                child_data_count = len(lazy_variable_controller)
                if child_data_count > 0:
                    if is_debug() or is_test():
                        print(
                            '[fetch_input_variables_for_dynamic_upstream_blocks] '
                            f'upstream:{upstream_block.uuid} -> {block.uuid}:'
                            f'{dynamic_block_index}: '
                            f'upstream_position_index:{upstream_position_index}, '
                            f'child_data_count:{child_data_count}, '
                            f'dynamic_upstream_item_counts:{dynamic_upstream_item_counts}'
                        )

                    index = calculate_dynamic_index_data_index(
                        dynamic_block_index,
                        upstream_position_index,
                        child_data_count,
                        dynamic_upstream_item_counts,
                    )
                    if index is not None:
                        pair = lazy_variable_controller.render(
                            child_dynamic_block_index=dynamic_block_index,
                        )
                        child_data, metadata = pair

                input_vars.append(child_data)
                kwargs_vars.append(metadata)
        elif is_dynamic:
            child_data_count = None
            is_partial_data_readable = False

            if MEMORY_MANAGER_V2:
                child_data_count, is_partial_data_readable = get_dynamic_children_count(
                    upstream_block,
                    execution_partition=execution_partition,
                )

            if child_data_count is not None and is_partial_data_readable:
                index = calculate_dynamic_index_data_index(
                    dynamic_block_index,
                    upstream_position_index,
                    child_data_count,
                    dynamic_upstream_item_counts,
                )
                child_data, metadata = get_partial_dynamic_block_outputs(
                    upstream_block,
                    index,
                    batch_settings=block.upstream_batch_settings(upstream_block.uuid),
                    chunks=block.upstream_chunks(upstream_block.uuid),
                    execution_partition=execution_partition,
                    input_data_types=block.input_data_types(upstream_block.uuid),
                )
                input_vars.append(child_data)

                if metadata is not None and isinstance(metadata, dict):
                    kwargs_vars.append(metadata)
            else:
                child_data, metadata = get_outputs_for_dynamic_block(
                    upstream_block,
                    execution_partition=execution_partition,
                )
                child_data_count = len(child_data) if hasattr(child_data, '__len__') else 0
                if child_data_count >= 1:
                    index = calculate_dynamic_index_data_index(
                        dynamic_block_index,
                        upstream_position_index,
                        child_data_count,
                        dynamic_upstream_item_counts,
                    )

                    if isinstance(child_data, list):
                        input_vars.append(child_data[index])
                    elif isinstance(child_data, (pd.DataFrame,)):
                        row = child_data.iloc[index]
                        input_vars.append(row)
                    elif isinstance(child_data, (pl.DataFrame,)):
                        row = child_data[index]
                        input_vars.append(row)
                    elif isinstance(child_data, dict):
                        input_vars.append(child_data.get(index))

                    if metadata is not None:
                        if isinstance(metadata, list) and index < len(metadata):
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
