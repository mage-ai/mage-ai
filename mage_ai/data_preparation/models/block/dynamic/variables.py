import asyncio
import os
from collections.abc import Sequence
from logging import Logger
from typing import Any, Dict, List, Tuple, Union

import pandas as pd

from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.shared.memory import get_memory_usage, get_memory_usage_async
from mage_ai.shared.strings import to_ordinal_integers


class LazyVariable:
    def __init__(
        self,
        block,
        variable: Variable,
        sample: int = None,
        sample_count: int = None,
        skip: bool = False,
    ):
        self.block = block
        self.sample = sample
        self.sample_count = sample_count
        self.variable = variable

    @property
    def is_dynamic(self):
        from mage_ai.data_preparation.models.block.dynamic.utils import is_dynamic_block
        return is_dynamic_block(self.block)

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
        self.lazy_variables = [LazyVariable(
            block,
            variable_object,
            **kwargs,
        ) for variable_object in variable_objects]
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
        return is_dynamic_block(self.block)

    @property
    def lazy_child_data(self) -> LazyVariable:
        return self[0]

    @property
    def lazy_metadata(self) -> LazyVariable:
        return self[1]

    def read_child_data(self) -> Any:
        if not isinstance(self.lazy_child_data, pd.DataFrame) and not self.lazy_child_data:
            return None

        return self.read_lazy_variable(
            self.lazy_child_data,
        ) if self.lazy_child_data is not None else None

    def read_metadata(self) -> Any:
        return self.read_lazy_variable(self.lazy_metadata) if self.lazy_metadata else {}

    def read_lazy_variable(self, lazy_variable: LazyVariable) -> Any:
        return get_memory_usage(
            logger=self.logger,
            logging_tags=self.logging_tags,
            message_prefix=f'[Block {lazy_variable.block.uuid}.read_data',
            wrapped_function=lazy_variable.read_data,
        )

    async def read_lazy_variable_async(self, lazy_variable: LazyVariable) -> Any:
        return await get_memory_usage_async(
            logger=self.logger,
            logging_tags=self.logging_tags,
            message_prefix=f'[Block {lazy_variable.block.uuid}.read_data',
            wrapped_function=lazy_variable.read_data_async,
        )

    def read_data(self) -> Tuple[Any, Any]:
        metadata = self.read_metadata()
        if metadata is None:
            metadata = {}
        return (
            self.read_child_data(),
            metadata,
        )

    async def read_data_async(self) -> Tuple[Any, Any]:
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
    def __init__(self, block, lazy_variable_sets: List[List[LazyVariableSet]]):
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
        return is_dynamic_block(self.block)

    def render(
        self,
        child_dynamic_block_index: int = None,
        dynamic_block_index: int = None,
    ) -> Union[List[Tuple], Tuple]:
        arr = self.lazy_variable_sets

        if child_dynamic_block_index is not None:
            index = child_dynamic_block_index % len(self)
            lazy_variable_set = arr[index]
            child_data, metadata = lazy_variable_set.read_data()

            if self.is_dynamic:
                if isinstance(child_data, pd.DataFrame):
                    index = child_dynamic_block_index % len(child_data.index)
                    child_data = child_data.iloc[index:index + 1]
                else:
                    index = child_dynamic_block_index % len(child_data)
                    child_data = child_data[index]
                metadata = metadata[index] if len(metadata) > index else {}

            return child_data, metadata

        if dynamic_block_index is not None:
            arr = arr[dynamic_block_index:dynamic_block_index + 1]
        return [lazy_variable_set.read_data() for lazy_variable_set in arr]

    async def render_async(self, dynamic_block_index: int = None):
        arr = self.lazy_variable_sets
        if dynamic_block_index is not None:
            arr = arr[dynamic_block_index:dynamic_block_index + 1]
        return await asyncio.gather(
            *[lazy_variable_set.read_data_async() for lazy_variable_set in arr],
        )


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

    if BlockLanguage.SQL == block.language:
        return values[0] if len(values) == 1 else values, None

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

    if BlockLanguage.SQL == block.language:
        return values[0] if len(values) == 1 else values, None

    if len(values) >= 2:
        return values[0], values[1]
    elif len(values) >= 1:
        return values[0], None

    return None, None


def get_outputs_for_dynamic_child(
    block,
    execution_partition: str = None,
    logger: Logger = None,
    logging_tags: Dict = None,
    sample: bool = False,
    sample_count: int = None,
) -> List[Tuple[List[Union[Dict, int, str, pd.DataFrame]], List[Dict]]]:
    # List[List[Variable]]
    list_of_lists_of_variables = __get_all_variable_objects_for_dynamic_child(
        block,
        execution_partition=execution_partition,
    )

    # List[List[LazyVariableSet]]
    lazy_variables_sets = [LazyVariableSet(
        block,
        variable_objects,
        logger=logger,
        logging_tags=logging_tags,
        sample=sample,
        sample_count=sample_count,
    ) for variable_objects in list_of_lists_of_variables]

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
            kwargs_vars.append(kr[0] if len(kr) > 0 else None)
            upstream_block_uuids.append(up[0])

    return input_vars, kwargs_vars, upstream_block_uuids
