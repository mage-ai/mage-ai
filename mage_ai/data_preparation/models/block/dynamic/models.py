from __future__ import annotations

import asyncio
import os
from collections.abc import Sequence
from logging import Logger
from typing import Any, Dict, List, Optional, Tuple, Union

import pandas as pd

from mage_ai.data.models.outputs.models import BlockOutput
from mage_ai.data.models.outputs.query import BlockOutputQuery, DynamicBlockOutputQuery
from mage_ai.data_preparation.models.constants import BlockLanguage, BlockType
from mage_ai.data_preparation.models.variable import Variable
from mage_ai.shared.strings import to_ordinal_integers


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

        return is_dynamic_block(self.block)

    @property
    def lazy_child_data(self) -> Union[List[LazyVariable], LazyVariable]:
        if len(self) == 2:
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

        return is_dynamic_block(self.block)

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
                if isinstance(child_data, pd.DataFrame):
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
