from mage_ai.data_preparation.models.variables.constants import VariableType

SUPPORTED_VARIABLE_TYPES = [
    VariableType.DATAFRAME,
    VariableType.POLARS_DATAFRAME,
    VariableType.SERIES_PANDAS,
]
