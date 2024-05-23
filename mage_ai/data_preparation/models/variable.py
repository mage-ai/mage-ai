from __future__ import annotations

import os
import traceback
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
import polars as pl
import scipy
from pandas.api.types import infer_dtype, is_object_dtype
from pandas.core.indexes.range import RangeIndex

from mage_ai.data.constants import InputDataType
from mage_ai.data.models.manager import DataManager
from mage_ai.data.tabular.models import BatchSettings
from mage_ai.data_cleaner.shared.utils import is_geo_dataframe, is_spark_dataframe
from mage_ai.data_preparation.models.block.settings.variables.models import (
    ChunkKeyTypeUnion,
)
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_ANALYSIS_KEYS,
    DATAFRAME_SAMPLE_COUNT,
    DATAFRAME_SAMPLE_MAX_COLUMNS,
    VARIABLE_DIR,
)
from mage_ai.data_preparation.models.utils import (  # dask_from_pandas,
    AMBIGUOUS_COLUMN_TYPES,
    STRING_SERIALIZABLE_COLUMN_TYPES,
    apply_transform_pandas,
    cast_column_types,
    cast_column_types_polars,
    deserialize_columns,
    deserialize_complex,
    infer_variable_type,
    serialize_columns,
    serialize_complex,
    should_deserialize_pandas,
    should_serialize_pandas,
)
from mage_ai.data_preparation.models.variables.constants import (
    DATAFRAME_COLUMN_TYPES_FILE,
    DATAFRAME_CSV_FILE,
    DATAFRAME_PARQUET_FILE,
    DATAFRAME_PARQUET_SAMPLE_FILE,
    JSON_FILE,
    JSON_SAMPLE_FILE,
    METADATA_FILE,
    VariableType,
)
from mage_ai.data_preparation.storage.base_storage import BaseStorage
from mage_ai.data_preparation.storage.local_storage import LocalStorage
from mage_ai.settings.repo import get_variables_dir
from mage_ai.settings.server import MEMORY_MANAGER_V2
from mage_ai.shared.array import is_iterable
from mage_ai.shared.hash import flatten_dict
from mage_ai.shared.outputs import load_custom_object, save_custom_object
from mage_ai.shared.parsers import deserialize_matrix, sample_output, serialize_matrix
from mage_ai.shared.utils import clean_name
from mage_ai.system.memory.manager import MemoryManager


class Variable:
    def __init__(
        self,
        uuid: str,
        pipeline_path: str,
        block_uuid: str,
        partition: Optional[str] = None,
        spark=None,
        storage: Optional[BaseStorage] = None,
        variable_type: Optional[VariableType] = None,
        clean_block_uuid: bool = True,
        validate_pipeline_path: bool = False,
        input_data_types: Optional[List[InputDataType]] = None,
        read_batch_settings: Optional[BatchSettings] = None,
        read_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
        variables_dir: str = None,
        write_batch_settings: Optional[BatchSettings] = None,
        write_chunks: Optional[List[ChunkKeyTypeUnion]] = None,
    ) -> None:
        self.uuid = uuid
        if storage is None:
            self.storage = LocalStorage()
        else:
            self.storage = storage

        if validate_pipeline_path and not self.storage.path_exists(pipeline_path):
            raise Exception(f'Pipeline path {pipeline_path} does not exist.')

        self.pipeline_path = pipeline_path
        self.block_uuid = block_uuid
        self.block_dir_name = clean_name(self.block_uuid) if clean_block_uuid else self.block_uuid
        self.partition = partition
        self.variable_dir_path = os.path.join(
            pipeline_path,
            VARIABLE_DIR,
            partition or '',
            self.block_dir_name,
        )
        if not self.storage.path_exists(self.variable_dir_path):
            self.storage.makedirs(self.variable_dir_path)

        self.variable_type = variable_type
        self.check_variable_type(spark=spark)

        self.input_data_types = input_data_types
        self.read_batch_settings = read_batch_settings
        self.read_chunks = read_chunks
        self.variables_dir = variables_dir or get_variables_dir()
        self.write_batch_settings = write_batch_settings
        self.write_chunks = write_chunks
        self._data_manager = None

    @classmethod
    def dir_path(cls, pipeline_path, block_uuid):
        return os.path.join(pipeline_path, VARIABLE_DIR, clean_name(block_uuid))

    @property
    def variable_path(self):
        return os.path.join(self.variable_dir_path, self.uuid or '')

    @property
    def metadata_path(self):
        return os.path.join(self.variable_path, METADATA_FILE)

    @property
    def data_manager(self) -> Optional[DataManager]:
        if self._data_manager is None:
            self._data_manager = DataManager(
                input_data_types=self.input_data_types,
                read_batch_settings=self.read_batch_settings,
                read_chunks=self.read_chunks,
                storage=self.storage,
                uuid=self.__scope_uuid(),
                variable_dir_path=self.variable_dir_path,
                variable_path=self.variable_path,
                variables_dir=self.variables_dir,
                variable_type=self.variable_type,
                write_batch_settings=self.write_batch_settings,
                write_chunks=self.write_chunks,
            )
        return self._data_manager

    def __scope_uuid(self) -> str:
        path_parts = [self.block_dir_name or '']
        try:
            path_parts.insert(
                0, str(Path(self.pipeline_path).relative_to(Path(self.variables_dir)))
            )
        except ValueError:
            pass

        return os.path.join(*path_parts)

    def check_variable_type(self, spark: Optional[Any] = None) -> Optional[VariableType]:
        """
        If the variable has a metadata file, read the variable type from the metadata file.
        Fallback to inferring variable type based on data in the storage.
        """
        if self.variable_type is None:
            try:
                if self.storage.path_exists(self.metadata_path):
                    # Consider removing raise_exception=True
                    metadata = self.storage.read_json_file(
                        self.metadata_path, raise_exception=True
                    )
                    self.variable_type = metadata.get('type')
            except Exception:
                traceback.print_exc()

        if self.variable_type is None and self.storage.path_exists(
            os.path.join(self.variable_path, DATAFRAME_PARQUET_FILE)
        ):
            # If parquet file exists for given variable, set the variable type to DATAFRAME
            self.variable_type = VariableType.DATAFRAME
        elif (
            self.variable_type == VariableType.DATAFRAME or self.variable_type is None
        ) and os.path.exists(os.path.join(self.variable_path, f'{self.uuid}', 'data.sh')):
            self.variable_type = VariableType.GEO_DATAFRAME
        elif (
            self.variable_type is None
            and len(self.storage.listdir(self.variable_path, suffix='.parquet')) > 0
            and spark is not None
        ):
            self.variable_type = VariableType.SPARK_DATAFRAME

        return self.variable_type

    def convert_parquet_to_csv(self):
        """
        For DATAFRAME variable, convert parquet files to csv files. Used in R blocks.
        """
        if self.variable_type != VariableType.DATAFRAME:
            return
        csv_file_path = os.path.join(self.variable_path, DATAFRAME_CSV_FILE)
        if self.storage.path_exists(csv_file_path):
            return
        df = self.__read_parquet()
        self.storage.write_csv(df, csv_file_path)

    def delete(self) -> None:
        """
        Delete the variable data.
        """
        if self.variable_type is None and self.storage.path_exists(
            os.path.join(self.variable_dir_path, f'{self.uuid}', DATAFRAME_PARQUET_FILE)
        ):
            # If parquet file exists for given variable, set the variable type to DATAFRAME
            self.variable_type = VariableType.DATAFRAME
        if self.variable_type == VariableType.DATAFRAME:
            self.__delete_parquet()
        elif self.variable_type == VariableType.DATAFRAME_ANALYSIS:
            return self.__delete_dataframe_analysis()

        # TODO (dangerous): How do we delete other variable types?

        return self.__delete_json()

    def read_data(
        self,
        dataframe_analysis_keys: Optional[List[str]] = None,
        raise_exception: bool = False,
        sample: bool = False,
        sample_count: Optional[int] = None,
        spark: Optional[Any] = None,
    ) -> Any:
        """
        Used by
            block.get_outputs
                WebSocker server sending block output to the IDE
            fetch_input_variables
                pipeline.get_block_variable
        """

        def __read(
            dataframe_analysis_keys=dataframe_analysis_keys,
            raise_exception=raise_exception,
            sample=sample,
            sample_count=sample_count,
            spark=spark,
        ):
            return self.__read_data(
                dataframe_analysis_keys=dataframe_analysis_keys,
                raise_exception=raise_exception,
                sample=sample,
                sample_count=sample_count,
                spark=spark,
            )

        if MEMORY_MANAGER_V2:
            with MemoryManager(scope_uuid=self.__scope_uuid(), process_uuid='variable.read_data'):
                return __read()
        return __read()

    def __read_data(
        self,
        dataframe_analysis_keys: Optional[List[str]] = None,
        raise_exception: bool = False,
        sample: bool = False,
        sample_count: Optional[int] = None,
        spark: Optional[Any] = None,
    ) -> Any:
        """
        Read variable data.

        Args:
            dataframe_analysis_keys (List[str], optional): For DATAFRAME_ANALYSIS variable,
                only read the selected keys.
            raise_exception (bool, optional): Whether to raise exception when reading variable
                data fails. Defaults to false.
            sample (bool, optional): Whether to sample the rows of a dataframe, used for
                DATAFRAME variable.
            sample_count (int, optional): The number of rows to sample, used for
                DATAFRAME variable.
            spark (None, optional): Spark context, used to read SPARK_DATAFRAME variable.
        """
        if self.data_manager and self.data_manager.readable():
            return self.data_manager.read_sync(
                sample=sample,
                sample_count=sample_count,
            )

        if (
            self.variable_type == VariableType.DATAFRAME
            or self.variable_type == VariableType.SERIES_PANDAS
        ):
            return self.__read_parquet(
                raise_exception=raise_exception,
                sample=sample,
                sample_count=sample_count,
            )
        elif self.variable_type == VariableType.POLARS_DATAFRAME:
            return self.__read_polars_parquet(
                raise_exception=raise_exception,
                sample=sample,
                sample_count=sample_count,
            )
        elif self.variable_type == VariableType.SPARK_DATAFRAME:
            return self.__read_spark_parquet(sample=sample, sample_count=sample_count, spark=spark)
        elif self.variable_type == VariableType.GEO_DATAFRAME:
            return self.__read_geo_dataframe(sample=sample, sample_count=sample_count)
        elif self.variable_type == VariableType.DATAFRAME_ANALYSIS:
            return self.__read_dataframe_analysis(dataframe_analysis_keys=dataframe_analysis_keys)
        else:
            data = self.__should_load_object()
            if data is not None:
                return data

            data = self.__read_json(raise_exception=raise_exception, sample=sample)

            if self.variable_type == VariableType.MATRIX_SPARSE:
                data = self.__read_matrix_sparse(data, sample=sample, sample_count=sample_count)
            elif (
                VariableType.DICTIONARY_COMPLEX == self.variable_type
                or VariableType.LIST_COMPLEX == self.variable_type
            ):
                data = self.__read_complex_object(data)

            return data

    async def read_data_async(
        self,
        dataframe_analysis_keys: Optional[List[str]] = None,
        sample: bool = False,
        sample_count: Optional[int] = None,
        spark: Optional[Any] = None,
        input_data_types: Optional[List[InputDataType]] = None,
    ) -> Any:
        """
        Used by
            block.to_dict_async
                GET /pipelines/[:uuid]
        """

        async def __read(
            dataframe_analysis_keys=dataframe_analysis_keys,
            sample=sample,
            sample_count=sample_count,
            spark=spark,
        ):
            return await self.__read_data_async(
                dataframe_analysis_keys=dataframe_analysis_keys,
                sample=sample,
                sample_count=sample_count,
                spark=spark,
            )

        if MEMORY_MANAGER_V2:
            with MemoryManager(
                scope_uuid=self.__scope_uuid(), process_uuid='variable.read_data_async'
            ):
                data = await __read()
        else:
            data = await __read()

        return data

    async def __read_data_async(
        self,
        dataframe_analysis_keys: Optional[List[str]] = None,
        sample: bool = False,
        sample_count: Optional[int] = None,
        spark: Optional[Any] = None,
    ) -> Any:
        """
        Read variable data asynchronously.

        Args:
            dataframe_analysis_keys (List[str], optional): For DATAFRAME_ANALYSIS variable,
                only read the selected keys.
            sample (bool, optional): Whether to sample the rows of a dataframe, used for
                DATAFRAME variable.
            sample_count (int, optional): The number of rows to sample, used for
                DATAFRAME variable.
            spark (None, optional): Spark context, used to read SPARK_DATAFRAME variable.

        Used by
            block.to_dict_async
                GET /pipelines/[:uuid]
        """
        if self.data_manager and self.data_manager.readable():
            data = await self.data_manager.read_async(
                sample=sample,
                sample_count=sample_count,
            )

            return data

        if (
            self.variable_type == VariableType.DATAFRAME
            or self.variable_type == VariableType.SERIES_PANDAS
        ):
            return self.__read_parquet(sample=sample, sample_count=sample_count)
        elif self.variable_type == VariableType.POLARS_DATAFRAME:
            return self.__read_polars_parquet(
                sample=sample,
                sample_count=sample_count,
            )
        elif self.variable_type == VariableType.SPARK_DATAFRAME:
            return self.__read_spark_parquet(sample=sample, sample_count=sample_count, spark=spark)
        elif self.variable_type == VariableType.DATAFRAME_ANALYSIS:
            return await self.__read_dataframe_analysis_async(
                dataframe_analysis_keys=dataframe_analysis_keys,
            )
        else:
            data = self.__should_load_object()
            if data is not None:
                return data

            data = await self.__read_json_async(sample=sample)

            if self.variable_type == VariableType.MATRIX_SPARSE:
                data = self.__read_matrix_sparse(data, sample=sample, sample_count=sample_count)
            elif (
                VariableType.DICTIONARY_COMPLEX == self.variable_type
                or VariableType.LIST_COMPLEX == self.variable_type
            ):
                data = self.__read_complex_object(data)

            return data

    def __read_complex_object(self, data: Union[Dict, List]) -> Union[Dict, List]:
        column_types_filename = os.path.join(self.variable_path, DATAFRAME_COLUMN_TYPES_FILE)
        if self.storage.path_exists(column_types_filename):
            column_types = self.storage.read_json_file(column_types_filename)
            data = deserialize_complex(
                data,
                column_types,
                unflatten=isinstance(data, dict),
            )

        return data

    def __save_complex_object(self, data: Union[Dict, List]) -> Union[Dict, List]:
        data, column_types = serialize_complex(
            flatten_dict(data) if isinstance(data, dict) else data,
            save_path=self.variable_path,
        )
        self.storage.write_json_file(
            os.path.join(self.variable_path, DATAFRAME_COLUMN_TYPES_FILE),
            column_types,
        )
        return data

    async def __save_complex_object_async(self, data: Union[Dict, List]) -> Union[Dict, List]:
        data, column_types = serialize_complex(
            flatten_dict(data) if isinstance(data, dict) else data,
            save_path=self.variable_path,
        )
        await self.storage.write_json_file_async(
            os.path.join(self.variable_path, DATAFRAME_COLUMN_TYPES_FILE),
            column_types,
        )
        return data

    def __should_save_object(self, data: Any) -> Tuple[Dict, Optional[str]]:
        return save_custom_object(data, self.variable_path, variable_type=self.variable_type)

    def __should_load_object(self) -> Optional[Any]:
        return load_custom_object(self.variable_path, self.variable_type)

    @contextmanager
    def open_to_write(self, filename: str):
        if not self.storage.isdir(self.variable_path):
            self.storage.makedirs(self.variable_path, exist_ok=True)

        with self.storage.open_to_write(self.full_path(filename)) as fi:
            yield fi

    def full_path(self, filename: Optional[str] = None) -> str:
        if filename:
            return os.path.join(self.variable_path, filename)

        return self.variable_path

    def write_data(self, data: Any) -> None:
        if MEMORY_MANAGER_V2:
            with MemoryManager(scope_uuid=self.__scope_uuid(), process_uuid='variable.write_data'):
                self.__write_data(data)
        else:
            self.__write_data(data)

    def __write_data(self, data: Any) -> None:
        """
        Write variable data to the persistent storage.

        Args:
            data (Any): Variable data to be written to storage.

        Used by:
            VariableManager
        """

        if self.data_manager and self.data_manager.writeable(data):
            # self.__write_dataframe_analysis
            self.data_manager.write_sync(data)
        else:
            if isinstance(data, pd.Series) and self.variable_type != VariableType.SERIES_PANDAS:
                data = data.to_list()

            if self.variable_type is None and isinstance(data, pd.DataFrame):
                self.variable_type = VariableType.DATAFRAME
            elif self.variable_type is None and isinstance(data, pl.DataFrame):
                self.variable_type = VariableType.POLARS_DATAFRAME
            elif is_spark_dataframe(data):
                self.variable_type = VariableType.SPARK_DATAFRAME
            elif is_geo_dataframe(data):
                self.variable_type = VariableType.GEO_DATAFRAME

            # Dataframe analysis variables share the same uuid as the original dataframe variable
            # so we won't write the metadata file for them
            if self.variable_type == VariableType.DATAFRAME_ANALYSIS:
                self.__write_dataframe_analysis(data)
                return

            if self.variable_type == VariableType.DATAFRAME:
                self.__write_parquet(data)
            elif self.variable_type == VariableType.POLARS_DATAFRAME:
                self.__write_polars_dataframe(data)
            elif self.variable_type == VariableType.SPARK_DATAFRAME:
                self.__write_spark_parquet(data)
            elif self.variable_type == VariableType.GEO_DATAFRAME:
                self.__write_geo_dataframe(data)
            elif self.variable_type == VariableType.MATRIX_SPARSE:
                self.__write_matrix_sparse(data)
            elif self.variable_type == VariableType.SERIES_PANDAS:
                if not self.__write_series_pandas(data):
                    self.__write_json(data)
            else:
                if (
                    VariableType.DICTIONARY_COMPLEX == self.variable_type
                    or VariableType.LIST_COMPLEX == self.variable_type
                ):
                    data = self.__save_complex_object(data)
                else:
                    data, _ = self.__should_save_object(data)

                self.__write_json(data)

        if self.variable_type != VariableType.SPARK_DATAFRAME:
            # Not write json file in spark data directory to avoid read error
            self.write_metadata()

        if VariableType.ITERABLE == self.variable_type:
            self.__write_dataframe_analysis(
                dict(
                    statistics=dict(
                        original_row_count=len(data),
                    ),
                )
            )

    async def write_data_async(self, data: Any) -> None:
        if MEMORY_MANAGER_V2:
            with MemoryManager(
                scope_uuid=self.__scope_uuid(), process_uuid='variable.write_data_async'
            ):
                await self.__write_data_async(data)
        else:
            await self.__write_data_async(data)

    async def __write_data_async(self, data: Any) -> None:
        """
        Write variable data to the persistent storage.

        Args:
            data (Any): Variable data to be written to storage.

        Used by:
            VariableManager
        """
        if self.data_manager and self.data_manager.writeable(data):
            await self.data_manager.write_async(data)
            # self.__write_dataframe_analysis
        else:
            if self.variable_type is None and isinstance(data, pd.DataFrame):
                self.variable_type = VariableType.DATAFRAME
            elif self.variable_type is None and isinstance(data, pl.DataFrame):
                self.variable_type = VariableType.POLARS_DATAFRAME
            elif is_spark_dataframe(data):
                self.variable_type = VariableType.SPARK_DATAFRAME
            elif is_geo_dataframe(data):
                self.variable_type = VariableType.GEO_DATAFRAME

            if self.variable_type == VariableType.DATAFRAME_ANALYSIS:
                self.__write_dataframe_analysis(data)
                return

            if self.variable_type == VariableType.DATAFRAME:
                self.__write_parquet(data)
            elif self.variable_type == VariableType.POLARS_DATAFRAME:
                self.__write_polars_dataframe(data)
            elif self.variable_type == VariableType.SPARK_DATAFRAME:
                self.__write_spark_parquet(data)
            elif self.variable_type == VariableType.GEO_DATAFRAME:
                self.__write_geo_dataframe(data)
            elif self.variable_type == VariableType.MATRIX_SPARSE:
                self.__write_matrix_sparse(data)
            elif self.variable_type == VariableType.SERIES_PANDAS:
                if not self.__write_series_pandas(data):
                    await self.__write_json_async(data)
            else:
                if (
                    VariableType.DICTIONARY_COMPLEX == self.variable_type
                    or VariableType.LIST_COMPLEX == self.variable_type
                ):
                    data = await self.__save_complex_object_asycn(data)
                else:
                    data, _ = self.__should_save_object(data)
                await self.__write_json_async(data)

        if self.variable_type != VariableType.SPARK_DATAFRAME:
            # Not write json file in spark data directory to avoid read error
            self.write_metadata()

        if VariableType.ITERABLE == self.variable_type:
            self.__write_dataframe_analysis(
                dict(
                    statistics=dict(
                        original_row_count=len(data),
                    ),
                )
            )

    def write_metadata(self) -> None:
        """
        Write metadata to the persistent storage.
        """
        metadata = dict(
            type=(
                self.variable_type.value
                if isinstance(self.variable_type, VariableType)
                else self.variable_type
            ),
        )
        self.storage.write_json_file(self.metadata_path, metadata)

    def __delete_dataframe_analysis(self) -> None:
        for k in DATAFRAME_ANALYSIS_KEYS:
            file_path = os.path.join(self.variable_path, f'{k}.json')
            if self.storage.path_exists(file_path):
                try:
                    self.storage.remove(file_path)
                except FileNotFoundError as err:
                    print(f'Error deleting file {file_path}: {err}')

    def __delete_json(self) -> None:
        old_file_path = os.path.join(self.variable_dir_path, f'{self.uuid}.json')
        if self.storage.path_exists(old_file_path):
            self.storage.remove(old_file_path)
        if self.storage.isdir(self.variable_path):
            self.storage.remove_dir(self.variable_path)

    def __delete_parquet(self) -> None:
        file_path = os.path.join(self.variable_path, DATAFRAME_PARQUET_FILE)

        if self.storage.path_exists(file_path):
            self.storage.remove(file_path)
            self.storage.remove_dir(self.variable_path)

    def __read_json(
        self,
        default_value: Dict = None,
        raise_exception: bool = False,
        sample: bool = False,
    ) -> Dict:
        if default_value is None:
            default_value = {}
        # For backward compatibility
        old_file_path = os.path.join(self.variable_dir_path, f'{self.uuid}.json')
        file_path = os.path.join(self.variable_path, JSON_FILE)
        sample_file_path = os.path.join(self.variable_path, JSON_SAMPLE_FILE)

        read_sample_success = False
        if sample and self.storage.path_exists(sample_file_path):
            try:
                data = self.storage.read_json_file(sample_file_path, default_value)
                read_sample_success = True
            except Exception:
                pass
        if not read_sample_success:
            if self.storage.path_exists(file_path):
                try:
                    data = self.storage.read_json_file(
                        file_path,
                        default_value=default_value,
                        raise_exception=raise_exception,
                    )
                except Exception as ex:
                    if raise_exception:
                        raise Exception(f'Failed to read json file: {file_path}') from ex
            else:
                try:
                    data = self.storage.read_json_file(
                        old_file_path,
                        default_value=default_value,
                        raise_exception=raise_exception,
                    )
                except Exception as ex:
                    if raise_exception:
                        raise Exception(f'Failed to read json file: {old_file_path}') from ex
        if sample:
            data = sample_output(data)[0]
        return data

    async def __read_json_async(self, default_value: Dict = None, sample: bool = False) -> Dict:
        if default_value is None:
            default_value = {}
        # For backward compatibility
        old_file_path = os.path.join(self.variable_dir_path, f'{self.uuid}.json')
        file_path = os.path.join(self.variable_path, JSON_FILE)
        sample_file_path = os.path.join(self.variable_path, JSON_SAMPLE_FILE)

        read_sample_success = False
        if sample and self.storage.path_exists(sample_file_path):
            try:
                data = await self.storage.read_json_file_async(sample_file_path, default_value)
                read_sample_success = True
            except Exception:
                pass
        if not read_sample_success:
            if self.storage.path_exists(file_path):
                data = await self.storage.read_json_file_async(file_path, default_value)
            else:
                data = await self.storage.read_json_file_async(old_file_path, default_value)
        if sample:
            data = sample_output(data)[0]
        return data

    def __write_json(self, data) -> None:
        if not self.storage.isdir(self.variable_path):
            self.storage.makedirs(self.variable_path, exist_ok=True)
        file_path = os.path.join(self.variable_path, JSON_FILE)
        sample_file_path = os.path.join(self.variable_path, JSON_SAMPLE_FILE)
        self.storage.write_json_file(file_path, data)
        self.storage.write_json_file(sample_file_path, sample_output(data)[0])

    async def __write_json_async(self, data) -> None:
        if not self.storage.isdir(self.variable_path):
            self.storage.makedirs(self.variable_path, exist_ok=True)
        file_path = os.path.join(self.variable_path, JSON_FILE)
        sample_file_path = os.path.join(self.variable_path, JSON_SAMPLE_FILE)
        try:
            await self.storage.write_json_file_async(file_path, data)
            await self.storage.write_json_file_async(sample_file_path, sample_output(data)[0])
        except Exception:
            traceback.print_exc()

    def __read_geo_dataframe(self, sample: bool = False, sample_count: Optional[int] = None):
        import geopandas as gpd

        file_path = os.path.join(self.variable_path, 'data.sh')
        sample_file_path = os.path.join(self.variable_path, 'sample_data.sh')
        if not os.path.exists(file_path):
            return gpd.GeoDataFrame()
        if sample and os.path.exists(sample_file_path):
            try:
                df = gpd.read_file(sample_file_path)
            except Exception:
                df = gpd.read_file(file_path)
        else:
            df = gpd.read_file(file_path)
        if sample:
            sample_count = sample_count or DATAFRAME_SAMPLE_COUNT
            if df.shape[0] > sample_count:
                df = df.iloc[:sample_count]
        return df

    def __read_parquet(
        self,
        sample: bool = False,
        sample_count: Optional[int] = None,
        raise_exception: bool = False,
    ) -> pd.DataFrame:
        file_path = os.path.join(self.variable_path, DATAFRAME_PARQUET_FILE)
        sample_file_path = os.path.join(self.variable_path, DATAFRAME_PARQUET_SAMPLE_FILE)

        read_sample_success = False
        if sample:
            try:
                df = self.storage.read_parquet(sample_file_path, engine='pyarrow')
                read_sample_success = True
            except Exception as ex:
                if raise_exception:
                    raise Exception(f'Failed to read parquet file: {sample_file_path}') from ex
                else:
                    traceback.print_exc()
        if not read_sample_success:
            try:
                df = self.storage.read_parquet(file_path, engine='pyarrow')
            except Exception as ex:
                if raise_exception:
                    raise Exception(f'Failed to read parquet file: {file_path}') from ex
                else:
                    traceback.print_exc()
                df = pd.DataFrame()
        if sample:
            sample_count = sample_count or DATAFRAME_SAMPLE_COUNT
            if df.shape[0] > sample_count:
                df = df.iloc[:sample_count]

        column_types_raw = None
        column_types_filename = os.path.join(self.variable_path, DATAFRAME_COLUMN_TYPES_FILE)
        if self.storage.path_exists(column_types_filename):
            column_types_raw = self.storage.read_json_file(column_types_filename)
            column_types = {}

            if self.variable_type == VariableType.SERIES_PANDAS:
                if isinstance(column_types_raw, list):
                    for col_data in column_types_raw:
                        column_types.update(col_data['column_types'])
            else:
                column_types = column_types_raw

            # ddf = dask_from_pandas(df)
            if should_deserialize_pandas(column_types):
                df = apply_transform_pandas(
                    df,
                    lambda row: deserialize_columns(row, column_types),
                )
            df = cast_column_types(df, column_types)

        if self.variable_type == VariableType.SERIES_PANDAS:
            if column_types_raw and isinstance(column_types_raw, list):
                series_list = []

                for col_data in column_types_raw:
                    column_mapping = col_data.get('column_mapping')
                    index = col_data.get('index')

                    columns_idx = []
                    columns = []
                    for col_idx, col in column_mapping.items():
                        columns_idx.append(col_idx)
                        columns.append(col)

                    df_series = df.iloc[: len(index)][columns_idx]
                    df_series.columns = columns
                    for col in df_series.columns:
                        series = df_series[col]
                        series.set_axis(index)
                        series_list.append(series)

                return series_list
            else:
                df = df.iloc[:, 0]

        return df

    def __read_matrix_sparse(
        self,
        json_dict: Union[Dict, List[Dict], Tuple[Dict]],
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> scipy.sparse._csr.csr_matrix:
        if isinstance(json_dict, list) or isinstance(json_dict, Tuple):
            return [self.__deserialize_matrix_sparse(d, sample, sample_count) for d in json_dict]

        return self.__deserialize_matrix_sparse(json_dict, sample, sample_count)

    def __deserialize_matrix_sparse(
        self,
        json_dict: Dict,
        sample: bool = False,
        sample_count: Optional[int] = None,
    ) -> scipy.sparse._csr.csr_matrix:
        csr_matrix = deserialize_matrix(json_dict)
        if sample:
            return csr_matrix[:sample_count, :DATAFRAME_SAMPLE_MAX_COLUMNS]

        return csr_matrix

    def __read_polars_parquet(
        self,
        sample: bool = False,
        sample_count: Optional[int] = None,
        raise_exception: bool = False,
    ) -> pl.DataFrame:
        file_path = os.path.join(self.variable_path, DATAFRAME_PARQUET_FILE)
        sample_file_path = os.path.join(self.variable_path, DATAFRAME_PARQUET_SAMPLE_FILE)

        read_sample_success = False
        if sample:
            try:
                df = self.storage.read_polars_parquet(sample_file_path, use_pyarrow=True)
                read_sample_success = True
            except Exception as ex:
                if raise_exception:
                    raise Exception(f'Failed to read parquet file: {sample_file_path}') from ex
                else:
                    traceback.print_exc()
        if not read_sample_success:
            try:
                df = self.storage.read_polars_parquet(file_path, use_pyarrow=True)
            except Exception as ex:
                if raise_exception:
                    raise Exception(f'Failed to read parquet file: {file_path}') from ex
                else:
                    traceback.print_exc()
                df = pl.DataFrame()
        if sample:
            sample_count = sample_count or DATAFRAME_SAMPLE_COUNT
            if df.shape[0] > sample_count:
                df = df.head(sample_count)

        column_types_filename = os.path.join(self.variable_path, DATAFRAME_COLUMN_TYPES_FILE)
        if self.storage.path_exists(column_types_filename):
            column_types = self.storage.read_json_file(column_types_filename)
            # No Mage specific code to serialize columns for polars when writing a variable,
            # so no need to deserialize columns here
            df = cast_column_types_polars(df, column_types)
        return df

    def __read_spark_parquet(
        self, sample: bool = False, sample_count: Optional[int] = None, spark=None
    ):
        if spark is None:
            return None
        df = (
            spark.read.format('parquet')
            .option('header', 'true')
            .option('inferSchema', 'true')
            .option('delimiter', ',')
            .load(self.variable_path)
        )
        if sample and sample_count:
            df = df.limit(sample_count)
        return df

    def __write_geo_dataframe(self, data) -> None:
        os.makedirs(self.variable_path, exist_ok=True)
        data.to_file(os.path.join(self.variable_path, 'data.sh'))
        df_sample_output = data.iloc[:DATAFRAME_SAMPLE_COUNT]
        df_sample_output.to_file(os.path.join(self.variable_path, 'sample_data.sh'))

    def __get_column_types(self, data: pd.DataFrame) -> Tuple[Dict, pd.DataFrame]:
        column_types = {}
        df_output = data.copy()
        # Clean up data types since parquet doesn't support mixed data types
        for c in df_output.columns:
            df_col = df_output[c]
            if type(df_col) is pd.DataFrame:
                raise Exception(f'Please do not use duplicate column name: "{c}"')
            c_dtype = df_col.dtype
            if not is_object_dtype(c_dtype):
                column_types[c] = str(c_dtype)
            else:
                series_non_null = df_col.dropna()
                if len(series_non_null) > 0:
                    sample_element = series_non_null.iloc[0]
                    coltype = type(sample_element)
                    coltype_inferred = infer_dtype(series_non_null)
                    if is_object_dtype(series_non_null.dtype):
                        if coltype.__name__ in STRING_SERIALIZABLE_COLUMN_TYPES:
                            cast_coltype = str
                        # If the column is a "primitive" type, i.e. int/bool/etc and there is
                        # a mix of types in the column, cast to string
                        elif (
                            not hasattr(sample_element, '__dict__')
                            and coltype_inferred in AMBIGUOUS_COLUMN_TYPES
                        ):
                            cast_coltype = str
                        else:
                            cast_coltype = coltype
                        try:
                            df_output[c] = series_non_null.astype(cast_coltype)
                            coltype = str
                        except Exception:
                            # Fall back to convert to string
                            # df_output[c] = series_non_null.astype(str)
                            pass

                    col_not_numpy_type = coltype.__module__ != np.__name__
                    col_is_numpy_array_type = coltype.__name__ == np.ndarray.__name__
                    if col_not_numpy_type or col_is_numpy_array_type:
                        column_types[c] = coltype.__name__
                    else:
                        column_types[c] = type(series_non_null.iloc[0].item()).__name__
        return column_types, df_output

    def __write_parquet(
        self,
        data: Union[pd.DataFrame, List[pd.Series]],
    ) -> None:
        column_types_to_test = {}

        is_series_list = (
            (isinstance(data, list) or isinstance(data, tuple))
            and len(data) >= 1
            and isinstance(data[0], pd.Series)
        )

        if is_series_list:
            df_output = pd.DataFrame()

            column_types = []
            for idx, series in enumerate(data):
                df_series = series.to_frame()
                column_mapping = {}

                columns = []
                for col in df_series.columns:
                    col_idx = f'{col}_{idx}'
                    column_mapping[col_idx] = col
                    columns.append(col_idx)

                df_series.columns = columns
                col_types, df_series = self.__get_column_types(df_series)

                df_output = pd.concat([df_output, df_series], axis=1)
                column_types.append(
                    dict(
                        column_mapping=column_mapping,
                        column_types=col_types,
                        index=series.index.to_list(),
                    )
                )
                column_types_to_test.update(col_types)
        else:
            column_types, df_output = self.__get_column_types(data)
            column_types_to_test.update(column_types)

        self.storage.makedirs(self.variable_path, exist_ok=True)
        self.storage.write_json_file(
            os.path.join(self.variable_path, DATAFRAME_COLUMN_TYPES_FILE),
            column_types,
        )

        if should_serialize_pandas(column_types_to_test):
            # Try using Polars to write the dataframe to improve performance
            if (
                type(df_output.index) is RangeIndex
                and df_output.index.start == 0
                and df_output.index.stop == df_output.shape[0]
                and df_output.index.step == 1
            ):
                # Polars ignores any index
                try:
                    pl_df = pl.from_pandas(df_output)
                    self.__write_polars_dataframe(pl_df)
                    # Test read dataframe from parquet
                    self.__read_parquet(sample=True, raise_exception=True)

                    return
                except Exception:
                    pass

            # ddf = dask_from_pandas(df_output)
            df_output_serialized = apply_transform_pandas(
                df_output,
                lambda row: serialize_columns(row, column_types_to_test),
            )
        else:
            df_output_serialized = df_output

        self.storage.write_parquet(
            df_output_serialized,
            os.path.join(self.variable_path, DATAFRAME_PARQUET_FILE),
        )

        try:
            df_sample_output = df_output_serialized.iloc[
                :DATAFRAME_SAMPLE_COUNT,
                :DATAFRAME_SAMPLE_MAX_COLUMNS,
            ]

            self.storage.write_parquet(
                df_sample_output,
                os.path.join(self.variable_path, DATAFRAME_PARQUET_SAMPLE_FILE),
            )
        except Exception as err:
            print(f'Sample output error: {err}.')
            traceback.print_exc()

        try:
            n_rows, n_cols = df_output_serialized.shape
            self.__write_dataframe_analysis(
                dict(
                    statistics=dict(
                        original_row_count=n_rows,
                        original_column_count=n_cols,
                    ),
                )
            )
        except Exception as err:
            print(f'Writing DataFrame analysis failed during writing parquet: {err}.')
            traceback.print_exc()

    def __write_polars_dataframe(self, data: pl.DataFrame) -> None:
        self.storage.makedirs(self.variable_path, exist_ok=True)

        self.storage.write_polars_dataframe(
            data,
            os.path.join(self.variable_path, DATAFRAME_PARQUET_FILE),
        )

        try:
            sample_columns = data.columns[:DATAFRAME_SAMPLE_MAX_COLUMNS]
            df_sample_output = data[
                :DATAFRAME_SAMPLE_COUNT,
                sample_columns,
            ]

            self.storage.write_polars_dataframe(
                df_sample_output,
                os.path.join(self.variable_path, DATAFRAME_PARQUET_SAMPLE_FILE),
            )
        except Exception as err:
            print(f'Sample output error: {err}.')
            traceback.print_exc()

    def __write_spark_parquet(self, data) -> None:
        (data.write.option('header', 'True').mode('overwrite').parquet(self.variable_path))

    def __read_dataframe_analysis(
        self,
        dataframe_analysis_keys: List[str] = None,
    ) -> Dict[str, Dict]:
        """
        Read the following files
        1. metadata.json
        2. statistics.json
        3. insights.json
        4. suggestions.json
        """
        if not self.storage.path_exists(self.variable_path):
            return dict()
        result = dict()
        for k in DATAFRAME_ANALYSIS_KEYS:
            if dataframe_analysis_keys is not None and k not in dataframe_analysis_keys:
                continue
            result[k] = self.storage.read_json_file(os.path.join(self.variable_path, f'{k}.json'))
        return result

    async def __read_dataframe_analysis_async(
        self,
        dataframe_analysis_keys: List[str] = None,
    ) -> Dict[str, Dict]:
        """
        Read the following files
        1. metadata.json
        2. statistics.json
        3. insights.json
        4. suggestions.json
        """
        if not self.storage.path_exists(self.variable_path):
            return dict()
        result = dict()
        for k in DATAFRAME_ANALYSIS_KEYS:
            if dataframe_analysis_keys is not None and k not in dataframe_analysis_keys:
                continue
            result[k] = await self.storage.read_json_file_async(
                os.path.join(self.variable_path, f'{k}.json')
            )
        return result

    def __write_dataframe_analysis(self, data: Dict[str, Dict]) -> None:
        """
        Write the following files
        1. metadata.json
        2. statistics.json
        3. insights.json
        4. suggestions.json
        """
        self.storage.makedirs(self.variable_path, exist_ok=True)
        for k in DATAFRAME_ANALYSIS_KEYS:
            self.storage.write_json_file(
                os.path.join(self.variable_path, f'{k}.json'), data.get(k)
            )

    def __write_series_pandas(self, data: Union[List[pd.Series], pd.Series]) -> bool:
        var_type, basic_iterable = infer_variable_type(data)
        if VariableType.SERIES_PANDAS == var_type:
            if basic_iterable:
                self.__write_parquet(data)
            else:
                self.__write_parquet(data.to_frame())

            row_count = None

            if isinstance(data, pd.Series):
                row_count = data.shape[0]
            elif is_iterable(data) and len(data) >= 1 and isinstance(data[0], pd.Series):
                row_count = sum([s.shape[0] for s in data])

            if row_count is not None:
                self.__write_dataframe_analysis(
                    dict(
                        statistics=dict(
                            original_row_count=row_count,
                            original_column_count=1,
                        ),
                    )
                )

            return True

        return False

    def __write_matrix_sparse(
        self,
        csr_matrix: Union[scipy.sparse._csr.csr_matrix, List[scipy.sparse._csr.csr_matrix]],
    ) -> None:
        if not self.storage.isdir(self.variable_path):
            self.storage.makedirs(self.variable_path, exist_ok=True)

        if isinstance(csr_matrix, list) or isinstance(csr_matrix, tuple):
            arr1 = []
            arr2 = []
            for matrix in csr_matrix:
                m_1, m_2 = self.__serialize_matrix_sparse(matrix)
                arr1.append(m_1)
                arr2.append(m_2)
            data = arr1
            data_sample = arr2
        else:
            data, data_sample = self.__serialize_matrix_sparse(csr_matrix)

        sample_file_path = os.path.join(self.variable_path, JSON_SAMPLE_FILE)
        self.storage.write_json_file(sample_file_path, data_sample)

        file_path = os.path.join(self.variable_path, JSON_FILE)
        self.storage.write_json_file(file_path, data)

        if isinstance(csr_matrix, scipy.sparse._csr.csr_matrix):
            self.__write_dataframe_analysis(
                dict(
                    statistics=dict(
                        original_row_count=csr_matrix.shape[0],
                        original_column_count=csr_matrix.shape[1],
                    ),
                )
            )

    def __serialize_matrix_sparse(
        self, csr_matrix: scipy.sparse._csr.csr_matrix
    ) -> Tuple[Dict, Dict]:
        sample = csr_matrix[:DATAFRAME_SAMPLE_COUNT, :DATAFRAME_SAMPLE_MAX_COLUMNS]
        data_sample = serialize_matrix(sample)
        data = serialize_matrix(csr_matrix)

        return data, data_sample
