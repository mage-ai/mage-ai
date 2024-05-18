from mage_ai.data_preparation.models.variables.constants import VariableType

READABLE_VARIABLE_TYPES = [
    VariableType.DATAFRAME,
    VariableType.DATAFRAME_ANALYSIS,
    VariableType.POLARS_DATAFRAME,
    VariableType.SERIES_PANDAS,
    VariableType.SPARK_DATAFRAME,
]

WRITEABLE_VARIABLE_TYPES = [] + READABLE_VARIABLE_TYPES
