from enum import Enum

CONFIG_JSON_FILE = 'config.json'
DATAFRAME_COLUMN_TYPES_FILE = 'data_column_types.json'
DATAFRAME_CSV_FILE = 'data.csv'
DATAFRAME_PARQUET_FILE = 'data.parquet'
DATAFRAME_PARQUET_SAMPLE_FILE = 'sample_data.parquet'
JOBLIB_FILE = 'model.joblib'
JOBLIB_OBJECT_FILE = 'object.joblib'
JSON_FILE = 'data.json'
MATRIX_NPZ_FILE = 'matrix.npz'
MATRIX_SAMPLE_NPZ_FILE = 'matrix.npz'
MEDIA_IMAGE_VISUALIZATION_FILE = 'visualization.png'
UBJSON_MODEL_FILENAME = 'model.ubj'


class VariableType(str, Enum):
    CUSTOM_OBJECT = 'custom_object'
    DATAFRAME = 'dataframe'
    DATAFRAME_ANALYSIS = 'dataframe_analysis'
    DICTIONARY_COMPLEX = 'dictionary_complex'
    GEO_DATAFRAME = 'geo_dataframe'
    ITERABLE = 'iterable'
    LIST_COMPLEX = 'list_complex'
    MATRIX_SPARSE = 'matrix_sparse'
    MODEL_SKLEARN = 'model_sklearn'
    MODEL_XGBOOST = 'model_xgboost'
    POLARS_DATAFRAME = 'polars_dataframe'
    SERIES_PANDAS = 'series_pandas'
    SERIES_POLARS = 'series_polars'
    SPARK_DATAFRAME = 'spark_dataframe'


class VariableAggregateDataType(str, Enum):
    INSIGHTS = 'insights'
    METADATA = 'metadata'
    RESOURCE_USAGE = 'resource_usage'
    SAMPLE_DATA = 'sample_data'
    STATISTICS = 'statistics'
    SUGGESTIONS = 'suggestions'
    TYPE = 'type'


class VariableAggregateDataTypeFilename(str, Enum):
    INSIGHTS = f'{VariableAggregateDataType.INSIGHTS}.json'
    METADATA = f'{VariableAggregateDataType.METADATA}.json'
    RESOURCE_USAGE = f'{VariableAggregateDataType.RESOURCE_USAGE}.json'
    SAMPLE_DATA = f'{VariableAggregateDataType.SAMPLE_DATA}.json'
    STATISTICS = f'{VariableAggregateDataType.STATISTICS}.json'
    SUGGESTIONS = f'{VariableAggregateDataType.SUGGESTIONS}.json'
    TYPE = f'{VariableAggregateDataType.TYPE}.json'


DATA_TYPE_FILENAME = {
    VariableAggregateDataType.INSIGHTS: VariableAggregateDataTypeFilename.INSIGHTS,
    VariableAggregateDataType.METADATA: VariableAggregateDataTypeFilename.METADATA,
    VariableAggregateDataType.RESOURCE_USAGE: VariableAggregateDataTypeFilename.RESOURCE_USAGE,
    VariableAggregateDataType.SAMPLE_DATA: VariableAggregateDataTypeFilename.SAMPLE_DATA,
    VariableAggregateDataType.STATISTICS: VariableAggregateDataTypeFilename.STATISTICS,
    VariableAggregateDataType.SUGGESTIONS: VariableAggregateDataTypeFilename.SUGGESTIONS,
    VariableAggregateDataType.TYPE: VariableAggregateDataTypeFilename.TYPE,
}


RESOURCE_USAGE_FILE = VariableAggregateDataTypeFilename.RESOURCE_USAGE.value
JSON_SAMPLE_FILE = VariableAggregateDataTypeFilename.SAMPLE_DATA.value
METADATA_FILE = VariableAggregateDataTypeFilename.TYPE.value


class VariableAggregateSummaryGroupType(str, Enum):
    DYNAMIC = 'dynamic'
    PARTS = 'parts'
