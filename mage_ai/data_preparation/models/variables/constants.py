from enum import Enum

DATAFRAME_COLUMN_TYPES_FILE = 'data_column_types.json'
METADATA_FILE = 'type.json'
JSON_FILE = 'data.json'
JSON_SAMPLE_FILE = 'sample_data.json'
DATAFRAME_CSV_FILE = 'data.csv'
DATAFRAME_PARQUET_FILE = 'data.parquet'
DATAFRAME_PARQUET_SAMPLE_FILE = 'sample_data.parquet'
JOBLIB_FILE = 'model.joblib'
JOBLIB_OBJECT_FILE = 'object.joblib'
UBJSON_MODEL_FILENAME = 'model.ubj'


class VariableType(str, Enum):
    CUSTOM_OBJECT = 'custom_object'
    DATAFRAME = 'dataframe'
    DATAFRAME_ANALYSIS = 'dataframe_analysis'
    DICTIONARY_COMPLEX = 'dictionary_complex'
    GEO_DATAFRAME = 'geo_dataframe'
    MATRIX_SPARSE = 'matrix_sparse'
    MODEL_SKLEARN = 'model_sklearn'
    MODEL_XGBOOST = 'model_xgboost'
    POLARS_DATAFRAME = 'polars_dataframe'
    SERIES_PANDAS = 'series_pandas'
    SPARK_DATAFRAME = 'spark_dataframe'
