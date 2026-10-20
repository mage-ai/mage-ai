from typing import Any, Dict, List, Optional, Union

import pandas as pd
import polars as pl

from mage_ai.data.constants import (
    InputDataType,
    OutputData,
    RecordBatchGenerator,
    ScanBatchDatasetResult,
)
from mage_ai.data.models.base import BaseData
from mage_ai.data.models.reader import Reader
from mage_ai.data.models.writer import Writer
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data_preparation.models.utils import infer_variable_type


class DataManager(BaseData):
    def __init__(
        self,
        input_data_types: Optional[List[InputDataType]],
        read_batch_settings: Optional[BatchSettings] = None,
        read_chunks: Optional[List] = None,
        write_batch_settings: Optional[BatchSettings] = None,
        write_chunks: Optional[List] = None,
        *args,
        **kwargs,
    ):
        super().__init__(*args, **kwargs)
        self.input_data_types = input_data_types or [InputDataType.DEFAULT]
        self.read_batch_settings = read_batch_settings
        self.read_chunks = read_chunks
        self.write_batch_settings = write_batch_settings
        self.write_chunks = write_chunks
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
                batch_settings=self.read_batch_settings,
                chunks=self.read_chunks,
                storage=self.storage,
                variable_dir_path=self.variable_dir_path,
                variable_path=self.variable_path,
                variable_type=self.variable_type,
                variable_types=self.variable_types,
                variables_dir=self.variables_dir,
            )
        return self._reader

    @property
    def writer(self) -> Writer:
        if not self._writer:
            self._writer = Writer(
                batch_settings=self.write_batch_settings,
                chunks=self.write_chunks,
                storage=self.storage,
                variable_dir_path=self.variable_dir_path,
                variable_path=self.variable_path,
                variable_type=self.variable_type,
                variable_types=self.variable_types,
                variables_dir=self.variables_dir,
            )
        return self._writer

    def read_sync(
        self,
        limit_parts: Optional[int] = None,
        part: Optional[int] = None,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[OutputData, ScanBatchDatasetResult, RecordBatchGenerator]]:
        def __process_batch(batch: ScanBatchDatasetResult):
            if batch is not None:
                if isinstance(batch, (pd.DataFrame, pd.Series, pl.DataFrame, pl.Series)):
                    return batch
                return batch.deserialize()

        def __process_generator(generator_batch):
            batches = [__process_batch(batch) for batch in generator_batch if batch is not None]

            if self.batch_type:
                return batches

            if len(batches) >= 1:
                item = batches[0]
                if isinstance(item, pl.DataFrame):
                    return pl.concat(batches)
                elif isinstance(item, pd.DataFrame):
                    return pd.concat(batches)

            return batches

        generator = self.reader.read_sync(
            limit_parts=limit_parts,
            part=part,
            sample=sample,
            sample_count=sample_count,
        )

        if sample:
            if self.number_of_outputs == 1:
                return __process_batch(generator)
            return [__process_batch(batch) for batch in generator]
        elif self.reader_type:
            return self.reader
        elif self.generator_type:
            return generator

        if self.number_of_outputs == 1:
            return __process_generator(generator)

        return [__process_generator(gen) for gen in generator]

    async def read_async(
        self,
        limit_parts: Optional[int] = None,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> Optional[Union[Any, str]]:
        return self.read_sync(limit_parts=limit_parts, sample=sample, sample_count=sample_count)

    async def write_async(
        self,
        data: Any,
        chunk_size: Optional[int] = None,
    ) -> Optional[Dict[str, int]]:
        self.__prepare(data, self.writer)
        return await self.writer.write_async(data)

    def write_sync(
        self,
        data: Any,
        chunk_size: Optional[int] = None,
    ) -> Optional[Dict[str, int]]:
        self.__prepare(data, self.writer)
        return self.writer.write_sync(data)

    def readable(self) -> bool:
        return self.reader.supported()

    def writeable(self, data: Optional[Any] = None) -> bool:
        return self.writer.supported(data=data)

    def __prepare(self, data: Any, base_data: BaseData) -> None:
        if self.variable_type is None:
            self.variable_type, _ = infer_variable_type(data)
            if self.variable_type is not None:
                base_data.variable_type = self.variable_type
