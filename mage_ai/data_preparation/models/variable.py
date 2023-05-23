import json
import os
import traceback
from enum import Enum
from typing import Any, Dict, List

import numpy as np
import pandas as pd
import polars as pl
from pandas.api.types import is_object_dtype
from pandas.core.indexes.range import RangeIndex

from mage_ai.data_cleaner.shared.utils import is_geo_dataframe, is_spark_dataframe
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_ANALYSIS_KEYS,
    DATAFRAME_SAMPLE_COUNT,
    DATAFRAME_SAMPLE_MAX_COLUMNS,
    VARIABLE_DIR,
)
from mage_ai.data_preparation.models.utils import (  # dask_from_pandas,
    STRING_SERIALIZABLE_COLUMN_TYPES,
    apply_transform_pandas,
    cast_column_types,
    deserialize_columns,
    serialize_columns,
)
from mage_ai.data_preparation.storage.base_storage import BaseStorage
from mage_ai.data_preparation.storage.local_storage import LocalStorage
from mage_ai.shared.parsers import sample_output
from mage_ai.shared.utils import clean_name

DATAFRAME_COLUMN_TYPES_FILE = 'data_column_types.json'
DATAFRAME_PARQUET_FILE = 'data.parquet'
DATAFRAME_PARQUET_SAMPLE_FILE = 'sample_data.parquet'
DATAFRAME_CSV_FILE = 'data.csv'

JSON_FILE = 'data.json'
JSON_SAMPLE_FILE = 'sample_data.json'


class VariableType(str, Enum):
    DATAFRAME = 'dataframe'
    DATAFRAME_ANALYSIS = 'dataframe_analysis'
    GEO_DATAFRAME = 'geo_dataframe'
    POLARS_DATAFRAME = 'polars_dataframe'
    SPARK_DATAFRAME = 'spark_dataframe'


class Variable:
    def __init__(
        self,
        uuid: str,
        pipeline_path: str,
        block_uuid: str,
        partition: str = None,
        spark=None,
        storage: BaseStorage = None,
        variable_type: VariableType = None
    ) -> None:
        self.uuid = uuid
        if storage is None:
            self.storage = LocalStorage()
        else:
            self.storage = storage
        # if not self.storage.path_exists(pipeline_path):
        #     raise Exception(f'Pipeline path {pipeline_path} does not exist.')
        self.pipeline_path = pipeline_path
        self.block_uuid = block_uuid
        self.block_dir_name = clean_name(self.block_uuid)
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

    @property
    def variable_path(self):
        return os.path.join(self.variable_dir_path, f'{self.uuid}')

    @classmethod
    def dir_path(self, pipeline_path, block_uuid):
        return os.path.join(pipeline_path, VARIABLE_DIR, clean_name(block_uuid))

    def check_variable_type(self, spark=None):
        """
        Infer variable type based on data in the storage.
        """
        if self.variable_type is None and self.storage.path_exists(
            os.path.join(self.variable_path, DATAFRAME_PARQUET_FILE)
        ):
            # If parquet file exists for given variable, set the variable type to DATAFRAME
            self.variable_type = VariableType.DATAFRAME
        elif ((self.variable_type == VariableType.DATAFRAME or self.variable_type is None)
                and os.path.exists(
                os.path.join(self.variable_dir_path, f'{self.uuid}', 'data.sh'))):
            self.variable_type = VariableType.GEO_DATAFRAME
        elif self.variable_type is None and \
                len(self.storage.listdir(self.variable_path, suffix='.parquet')) > 0 and \
                spark is not None:
            self.variable_type = VariableType.SPARK_DATAFRAME

    def convert_parquet_to_csv(self):
        """
        For DATAFRAME variable, convert parquet files to csv files.
        """
        if self.variable_type != VariableType.DATAFRAME:
            return
        csv_file_path = os.path.join(self.variable_path, DATAFRAME_CSV_FILE)
        if self.storage.path_exists(csv_file_path):
            return
        df = self.__read_parquet()
        self.storage.write_csv(df, csv_file_path)

    def delete(self):
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
        return self.__delete_json()

    def read_data(
        self,
        dataframe_analysis_keys: List[str] = None,
        sample: bool = False,
        sample_count: int = None,
        spark=None,
    ) -> Any:
        """
        Read variable data.

        Args:
            dataframe_analysis_keys (List[str], optional): For DATAFRAME_ANALYSIS variable,
                only read the selected keys.
            sample (bool, optional): Whether to sample the rows of a dataframe, used for
                DATAFRAME variable.
            sample_count (int, optional): The number of rows to sample, used for
                DATAFRAME variable.
            spark (None, optional): Spark context, used to read SPARK_DATAFRAME variable.
        """
        if self.variable_type == VariableType.DATAFRAME:
            return self.__read_parquet(sample=sample, sample_count=sample_count)
        elif self.variable_type == VariableType.SPARK_DATAFRAME:
            return self.__read_spark_parquet(sample=sample, sample_count=sample_count, spark=spark)
        elif self.variable_type == VariableType.GEO_DATAFRAME:
            return self.__read_geo_dataframe(sample=sample, sample_count=sample_count)
        elif self.variable_type == VariableType.DATAFRAME_ANALYSIS:
            return self.__read_dataframe_analysis(dataframe_analysis_keys=dataframe_analysis_keys)
        return self.__read_json(sample=sample)

    async def read_data_async(
        self,
        dataframe_analysis_keys: List[str] = None,
        sample: bool = False,
        sample_count: int = None,
        spark=None,
    ):
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
        """
        if self.variable_type == VariableType.DATAFRAME:
            return self.__read_parquet(sample=sample, sample_count=sample_count)
        elif self.variable_type == VariableType.SPARK_DATAFRAME:
            return self.__read_spark_parquet(sample=sample, sample_count=sample_count, spark=spark)
        elif self.variable_type == VariableType.DATAFRAME_ANALYSIS:
            return await self.__read_dataframe_analysis_async(
                dataframe_analysis_keys=dataframe_analysis_keys,
            )
        return await self.__read_json_async(sample=sample)

    def write_data(self, data: Any) -> None:
        """
        Write variable data to the persistent storage.

        Args:
            data (Any): Variable data to be written to storage.
        """
        if self.variable_type is None and type(data) is pd.DataFrame:
            self.variable_type = VariableType.DATAFRAME
        elif self.variable_type is None and type(data) is pl.DataFrame:
            self.variable_type = VariableType.POLARS_DATAFRAME
        elif is_spark_dataframe(data):
            self.variable_type = VariableType.SPARK_DATAFRAME
        elif is_geo_dataframe(data):
            self.variable_type = VariableType.GEO_DATAFRAME

        if self.variable_type == VariableType.DATAFRAME:
            self.__write_parquet(data)
        elif self.variable_type == VariableType.POLARS_DATAFRAME:
            self.__write_polars_dataframe(data)
        elif self.variable_type == VariableType.SPARK_DATAFRAME:
            self.__write_spark_parquet(data)
        elif self.variable_type == VariableType.GEO_DATAFRAME:
            self.__write_geo_dataframe(data)
        elif self.variable_type == VariableType.DATAFRAME_ANALYSIS:
            self.__write_dataframe_analysis(data)
        else:
            self.__write_json(data)

    async def write_data_async(self, data: Any) -> None:
        """
        Write variable data to the persistent storage.

        Args:
            data (Any): Variable data to be written to storage.
        """
        if self.variable_type is None and type(data) is pd.DataFrame:
            self.variable_type = VariableType.DATAFRAME
        elif self.variable_type is None and type(data) is pl.DataFrame:
            self.variable_type = VariableType.POLARS_DATAFRAME
        elif is_spark_dataframe(data):
            self.variable_type = VariableType.SPARK_DATAFRAME
        elif is_geo_dataframe(data):
            self.variable_type = VariableType.GEO_DATAFRAME

        if self.variable_type == VariableType.DATAFRAME:
            self.__write_parquet(data)
        elif self.variable_type == VariableType.POLARS_DATAFRAME:
            self.__write_polars_dataframe(data)
        elif self.variable_type == VariableType.SPARK_DATAFRAME:
            self.__write_spark_parquet(data)
        elif self.variable_type == VariableType.GEO_DATAFRAME:
            self.__write_geo_dataframe(data)
        elif self.variable_type == VariableType.DATAFRAME_ANALYSIS:
            self.__write_dataframe_analysis(data)
        else:
            await self.__write_json_async(data)

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

    def __read_json(self, default_value: Dict = None, sample: bool = False) -> Dict:
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
                data = self.storage.read_json_file(file_path, default_value)
            else:
                data = self.storage.read_json_file(old_file_path, default_value)
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

    def __read_geo_dataframe(self, sample: bool = False, sample_count: int = None):
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
        sample_count: int = None,
        raise_exception: bool = False,
    ) -> pd.DataFrame:
        file_path = os.path.join(self.variable_path, DATAFRAME_PARQUET_FILE)
        sample_file_path = os.path.join(self.variable_path, DATAFRAME_PARQUET_SAMPLE_FILE)

        read_sample_success = False
        if sample:
            try:
                df = self.storage.read_parquet(sample_file_path, engine='pyarrow')
                read_sample_success = True
            except Exception as e:
                if raise_exception:
                    raise e
                pass
        if not read_sample_success:
            try:
                df = self.storage.read_parquet(file_path, engine='pyarrow')
            except Exception as e:
                if raise_exception:
                    raise e
                df = pd.DataFrame()
        if sample:
            sample_count = sample_count or DATAFRAME_SAMPLE_COUNT
            if df.shape[0] > sample_count:
                df = df.iloc[:sample_count]

        column_types_filename = os.path.join(self.variable_path, DATAFRAME_COLUMN_TYPES_FILE)
        if os.path.exists(column_types_filename):
            with open(column_types_filename, 'r') as f:
                column_types = json.load(f)
                # ddf = dask_from_pandas(df)
                df = apply_transform_pandas(df, lambda row: deserialize_columns(row, column_types))
                df = cast_column_types(df, column_types)
        return df

    def __read_spark_parquet(self, sample: bool = False, sample_count: int = None, spark=None):
        if spark is None:
            return None
        df = (
            spark.read
            .format('parquet')
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

    def __write_parquet(self, data: pd.DataFrame) -> None:
        column_types = {}
        df_output = data.copy()
        # Clean up data types since parquet doesn't support mixed data types
        for c in df_output.columns:
            c_dtype = df_output[c].dtype
            if not is_object_dtype(c_dtype):
                column_types[c] = str(c_dtype)
            else:
                series_non_null = df_output[c].dropna()
                if len(series_non_null) > 0:
                    coltype = type(series_non_null.iloc[0])
                    if is_object_dtype(series_non_null.dtype):
                        if coltype.__name__ in STRING_SERIALIZABLE_COLUMN_TYPES:
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

        self.storage.makedirs(self.variable_path, exist_ok=True)
        with open(os.path.join(self.variable_path, DATAFRAME_COLUMN_TYPES_FILE), 'w') as f:
            f.write(json.dumps(column_types))

        # Try using Polars to write the dataframe to improve performance
        if type(df_output.index) is RangeIndex and df_output.index.start == 0 \
                and df_output.index.stop == df_output.shape[0] and df_output.index.step == 1:
            # Polars ignores any index
            try:
                pl_df = pl.from_pandas(df_output)
                self.__write_polars_dataframe(pl_df)
                # Test read dataframe from parquet
                self. __read_parquet(sample=True, raise_exception=True)

                return
            except Exception:
                pass

        # ddf = dask_from_pandas(df_output)
        df_output_serialized = apply_transform_pandas(
            df_output,
            lambda row: serialize_columns(row, column_types),
        )

        self.storage.write_parquet(
            df_output_serialized,
            os.path.join(self.variable_path, DATAFRAME_PARQUET_FILE),
        )

        try:
            df_sample_output = df_output_serialized.iloc[
                :DATAFRAME_SAMPLE_COUNT,
                :DATAFRAME_SAMPLE_MAX_COLUMNS
            ]

            self.storage.write_parquet(
                df_sample_output,
                os.path.join(self.variable_path, DATAFRAME_PARQUET_SAMPLE_FILE),
            )
        except Exception as err:
            print(f'Sample output error: {err}.')
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
        (
            data.write
            .option('header', 'True')
            .mode('overwrite')
            .parquet(self.variable_path)
        )

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
                os.path.join(self.variable_path, f'{k}.json'))
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
            self.storage.write_json_file(os.path.join(self.variable_path, f'{k}.json'), data.get(k))
