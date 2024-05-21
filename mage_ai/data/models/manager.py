from typing import Any, List, Optional, Union

import polars as pl

from mage_ai.data.constants import (
    InputDataType,
    OutputData,
    RecordBatchGenerator,
    ScanBatchDatasetResult,
)
from mage_ai.data.models.reader import Reader
from mage_ai.data.models.shared import BaseData
from mage_ai.data.models.writer import Writer
from mage_ai.data.tabular.constants import DEFAULT_BATCH_ITEMS_VALUE
from mage_ai.data_preparation.models.utils import infer_variable_type


class DataManager(BaseData):
    def __init__(self, input_data_types: Optional[List[InputDataType]], *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.input_data_types = input_data_types or [InputDataType.DEFAULT]
        self._reader = None
        self._writer = None

    @property
    def batch_type(self) -> bool:
        return InputDataType.BATCH in (self.input_data_types or [])

    @property
    def default_type(self) -> bool:
        return not self.batch_type and not self.generator_type and not self.reader_type

    @property
    def generator_type(self) -> bool:
        return InputDataType.GENERATOR in (self.input_data_types or [])

    @property
    def reader_type(self) -> bool:
        return InputDataType.READER in (self.input_data_types or [])

    @property
    def reader(self) -> Reader:
        if not self._reader:
            self._reader = Reader(
                batch_settings=self.batch_settings,
                storage=self.storage,
                variable_dir_path=self.variable_dir_path,
                variable_path=self.variable_path,
                variable_type=self.variable_type,
            )
        return self._reader

    @property
    def writer(self) -> Writer:
        if not self._writer:
            self._writer = Writer(
                storage=self.storage,
                variable_dir_path=self.variable_dir_path,
                variable_path=self.variable_path,
                variable_type=self.variable_type,
            )
        return self._writer

    def read_sync(
        self,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[OutputData, ScanBatchDatasetResult, RecordBatchGenerator]]:
        generator = self.reader.read_sync(sample=sample, sample_count=sample_count)

        if sample:
            return generator

        if self.reader_type:
            return self.reader

        if self.generator_type:
            return generator

        if self.batch_type:
            return [batch.deserialize() for batch in generator if batch is not None]

        return pl.concat([batch.deserialize() for batch in generator if batch is not None])

    async def read_async(
        self,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[Any, str]]:
        return await self.reader.read_async(sample=sample, sample_count=sample_count)

    async def write_async(self, data: Any, chunk_size: Optional[int] = None) -> None:
        self.__prepare(data, self.writer)
        await self.writer.write_async(data, chunk_size=chunk_size or DEFAULT_BATCH_ITEMS_VALUE)

    def write_sync(self, data: Any, chunk_size: Optional[int] = None) -> None:
        self.__prepare(data, self.writer)
        self.writer.write_sync(data, chunk_size=chunk_size or DEFAULT_BATCH_ITEMS_VALUE)

    def readable(self) -> bool:
        return self.reader.supported()

    def writeable(self, data: Optional[Any] = None) -> bool:
        return self.writer.supported(data=data)

    def __prepare(self, data: Any, base_data: BaseData) -> None:
        if self.variable_type is None:
            self.variable_type, _ = infer_variable_type(data)
            if self.variable_type is not None:
                base_data.variable_type = self.variable_type
