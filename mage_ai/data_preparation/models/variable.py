from enum import Enum
from mage_ai.data_cleaner.shared.utils import (
    is_geo_dataframe,
    is_spark_dataframe,
)
from mage_ai.data_preparation.models.constants import (
    DATAFRAME_ANALYSIS_KEYS,
    DATAFRAME_SAMPLE_COUNT,
    VARIABLE_DIR,
)
from mage_ai.shared.parsers import encode_complex
from typing import Any, Dict
import json
import simplejson
import os
import pandas as pd
import shutil


class VariableType(str, Enum):
    DATAFRAME = 'dataframe'
    DATAFRAME_ANALYSIS = 'dataframe_analysis'
    GEO_DATAFRAME = 'geo_dataframe'
    SPARK_DATAFRAME = 'spark_dataframe'


class Variable:
    def __init__(
        self,
        uuid: str,
        pipeline_path: str,
        block_uuid: str,
        partition: str = None,
        variable_type: VariableType = None
    ) -> None:
        self.uuid = uuid
        if not os.path.exists(pipeline_path):
            raise Exception(f'Pipeline {pipeline_path} does not exist.')
        self.pipeline_path = pipeline_path
        self.block_uuid = block_uuid
        self.partition = partition
        self.variable_dir_path = os.path.join(
            pipeline_path,
            VARIABLE_DIR,
            partition or '',
            block_uuid,
        )
        if not os.path.exists(self.variable_dir_path):
            os.makedirs(self.variable_dir_path)

        self.variable_type = variable_type
        self.check_variable_type()

    def check_variable_type(self):
        if self.variable_type is None and os.path.exists(
            os.path.join(self.variable_dir_path, f'{self.uuid}', 'data.parquet')
        ):
            # If parquet file exists for given variable, set the variable type to DATAFRAME
            self.variable_type = VariableType.DATAFRAME
        elif ((self.variable_type == VariableType.DATAFRAME or self.variable_type is None)
                and os.path.exists(
                os.path.join(self.variable_dir_path, f'{self.uuid}', 'data.sh'))):
            self.variable_type = VariableType.GEO_DATAFRAME

    @classmethod
    def dir_path(self, pipeline_path, block_uuid):
        return os.path.join(pipeline_path, VARIABLE_DIR, block_uuid)

    def delete(self):
        if self.variable_type is None and os.path.exists(
            os.path.join(self.variable_dir_path, f'{self.uuid}', 'data.parquet')
        ):
            # If parquet file exists for given variable, set the variable type to DATAFRAME
            self.variable_type = VariableType.DATAFRAME
        if self.variable_type == VariableType.DATAFRAME:
            self.__delete_parquet()
        elif self.variable_type == VariableType.DATAFRAME_ANALYSIS:
            return self.__delete_dataframe_analysis()
        return self.__delete_json()

    def write_data(self, data: Any) -> None:
        if self.variable_type is None and type(data) is pd.DataFrame:
            self.variable_type = VariableType.DATAFRAME
        elif is_spark_dataframe(data):
            self.variable_type = VariableType.SPARK_DATAFRAME
        elif is_geo_dataframe(data):
            self.variable_type = VariableType.GEO_DATAFRAME

        if self.variable_type == VariableType.DATAFRAME:
            self.__write_parquet(data)
        elif self.variable_type == VariableType.SPARK_DATAFRAME:
            self.__write_spark_parquet(data)
        elif self.variable_type == VariableType.GEO_DATAFRAME:
            self.__write_geo_dataframe(data)
        elif self.variable_type == VariableType.DATAFRAME_ANALYSIS:
            self.__write_dataframe_analysis(data)
        else:
            self.__write_json(data)

    def read_data(self, sample: bool = False, sample_count: int = None, spark=None) -> Any:
        self.check_variable_type()

        if self.variable_type == VariableType.DATAFRAME:
            return self.__read_parquet(sample=sample, sample_count=sample_count)
        elif self.variable_type == VariableType.SPARK_DATAFRAME:
            return self.__read_spark_parquet(sample=sample, sample_count=sample_count, spark=spark)
        elif self.variable_type == VariableType.GEO_DATAFRAME:
            return self.__read_geo_dataframe(sample=sample, sample_count=sample_count)
        elif self.variable_type == VariableType.DATAFRAME_ANALYSIS:
            return self.__read_dataframe_analysis()
        return self.__read_json()

    def __delete_dataframe_analysis(self) -> None:
        variable_path = os.path.join(self.variable_dir_path, f'{self.uuid}')
        for k in DATAFRAME_ANALYSIS_KEYS:
            file_path = os.path.join(variable_path, f'{k}.json')
            if os.path.exists(file_path):
                os.remove(file_path)

    def __delete_json(self) -> None:
        file_path = os.path.join(self.variable_dir_path, f'{self.uuid}.json')
        if os.path.exists(file_path):
            os.remove(file_path)

    def __delete_parquet(self) -> None:
        variable_path = os.path.join(self.variable_dir_path, f'{self.uuid}')
        file_path = os.path.join(variable_path, 'data.parquet')
        if os.path.exists(file_path):
            os.remove(file_path)
            shutil.rmtree(variable_path)

    def __read_json(self, default_value={}) -> Dict:
        file_path = os.path.join(self.variable_dir_path, f'{self.uuid}.json')
        return self.__read_json_file(file_path, default_value)

    def __write_json(self, data) -> None:
        if not os.path.isdir(self.variable_dir_path):
            os.mkdir(self.variable_dir_path)
        self.__write_json_file(os.path.join(self.variable_dir_path, f'{self.uuid}.json'), data)

    def __read_json_file(self, file_path: str, default_value={}) -> Dict:
        if not os.path.exists(file_path):
            return default_value
        with open(file_path) as file:
            return json.load(file)

    def __write_json_file(self, file_path: str, data) -> None:
        with open(file_path, 'w') as file:
            simplejson.dump(
                data,
                file,
                default=encode_complex,
                ignore_nan=True,
            )

    def __read_geo_dataframe(self, sample: bool = False, sample_count: int = None):
        import geopandas as gpd

        variable_path = os.path.join(self.variable_dir_path, f'{self.uuid}')
        file_path = os.path.join(variable_path, 'data.sh')
        sample_file_path = os.path.join(variable_path, 'sample_data.sh')
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

    def __read_parquet(self, sample: bool = False, sample_count: int = None) -> pd.DataFrame:
        variable_path = os.path.join(self.variable_dir_path, f'{self.uuid}')
        file_path = os.path.join(variable_path, 'data.parquet')
        sample_file_path = os.path.join(variable_path, 'sample_data.parquet')
        if not os.path.exists(file_path):
            return pd.DataFrame()
        if sample and os.path.exists(sample_file_path):
            try:
                df = pd.read_parquet(sample_file_path, engine='pyarrow')
            except Exception:
                df = pd.read_parquet(file_path, engine='pyarrow')
        else:
            df = pd.read_parquet(file_path, engine='pyarrow')
        if sample:
            sample_count = sample_count or DATAFRAME_SAMPLE_COUNT
            if df.shape[0] > sample_count:
                df = df.iloc[:sample_count]
        return df

    def __read_spark_parquet(self, sample: bool = False, sample_count: int = None, spark=None):
        if spark is None:
            return None
        variable_path = os.path.join(self.variable_dir_path, f'{self.uuid}')
        return (
            spark.read
            .format('csv')
            .option('header', 'true')
            .option('inferSchema', 'true')
            .option('delimiter', ',')
            .load(variable_path)
        )

    def __write_geo_dataframe(self, data) -> None:
        variable_path = os.path.join(self.variable_dir_path, f'{self.uuid}')
        os.makedirs(variable_path, exist_ok=True)
        data.to_file(os.path.join(variable_path, 'data.sh'))
        df_sample_output = data.iloc[:DATAFRAME_SAMPLE_COUNT]
        df_sample_output.to_file(os.path.join(variable_path, 'sample_data.sh'))

    def __write_parquet(self, data: pd.DataFrame) -> None:
        df_output = data.copy()
        # Clean up data types since parquet doesn't support mixed data types
        for c in df_output.columns:
            series_non_null = df_output[c].dropna()
            if len(series_non_null) > 0:
                coltype = type(series_non_null.iloc[0])
                try:
                    df_output[c] = series_non_null.astype(coltype)
                except Exception:
                    # Fall back to convert to string
                    df_output[c] = series_non_null.astype(str)
        variable_path = os.path.join(self.variable_dir_path, f'{self.uuid}')
        os.makedirs(variable_path, exist_ok=True)
        df_output.to_parquet(os.path.join(variable_path, 'data.parquet'))
        df_sample_output = df_output.iloc[:DATAFRAME_SAMPLE_COUNT]
        df_sample_output.to_parquet(os.path.join(variable_path, 'sample_data.parquet'))

    def __write_spark_parquet(self, data) -> None:
        variable_path = os.path.join(self.variable_dir_path, f'{self.uuid}')
        (
            data.write
            .option('header', 'True')
            .mode('overwrite')
            .csv(variable_path)
        )

    def __read_dataframe_analysis(self) -> Dict[str, Dict]:
        """
        Read the following files
        1. metadata.json
        2. statistics.json
        3. insights.json
        4. suggestions.json
        """
        variable_path = os.path.join(self.variable_dir_path, f'{self.uuid}')
        if not os.path.exists(variable_path):
            return dict()
        result = dict()
        for k in DATAFRAME_ANALYSIS_KEYS:
            result[k] = self.__read_json_file(os.path.join(variable_path, f'{k}.json'))
        return result

    def __write_dataframe_analysis(self, data: Dict[str, Dict]) -> None:
        """
        Write the following files
        1. metadata.json
        2. statistics.json
        3. insights.json
        4. suggestions.json
        """
        variable_path = os.path.join(self.variable_dir_path, f'{self.uuid}')
        os.makedirs(variable_path, exist_ok=True)
        for k in DATAFRAME_ANALYSIS_KEYS:
            self.__write_json_file(os.path.join(variable_path, f'{k}.json'), data.get(k))
