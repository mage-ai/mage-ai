from enum import Enum
from typing import Callable, Dict, List, Mapping

from pandas import DataFrame, Series
from pandas.api.types import infer_dtype

from mage_ai.shared.utils import clean_name

"""
Utilities for exporting Python data frames to external databases.
"""


class BadConversionError(Exception):
    """
    Unable to convert Python-based data type to SQL equivalent.
    """

    pass


class PandasTypes(str, Enum):
    """
    Internal datatypes defined by the pandas Public API
    """

    BOOLEAN = 'boolean'
    BYTES = 'bytes'
    CATEGORICAL = 'categorical'
    COMPLEX = 'complex'
    DATE = 'date'
    DATETIME = 'datetime'
    DATETIME64 = 'datetime64'
    DECIMAL = 'decimal'
    INTEGER = 'integer'
    INT64 = 'int64'
    EMPTY = 'empty'
    FLOATING = 'floating'
    MIXED = 'mixed'
    MIXED_INTEGER = 'mixed-integer'
    MIXED_INTEGER_FLOAT = 'mixed-integer-float'
    OBJECT = 'object'
    PERIOD = 'period'
    STRING = 'string'
    TIME = 'time'
    TIMEDELTA = 'timedelta'
    TIMEDELTA64 = 'timedelta64'
    UNKNOWN_ARRAY = 'unknown-array'


def infer_dtypes(df: DataFrame) -> Dict[str, str]:
    """
    Fetches the internal pandas datatypes for the columns in the data frame.

    Args:
        df (DataFrame): Data frame to fetch dtypes from.

    Returns:
        Dict[str, str]: Map of column names to inferred dtypes
    """
    columns = []
    if type(df) is DataFrame:
        columns = df.columns
        return {column: infer_dtype(df[column], skipna=True) for column in columns}
    elif type(df) is dict:
        columns = df.keys()
        return {column: type(df[column]) for column in columns}

    return {}


def clean_df_for_export(
    df: DataFrame,
    column_mapper: Callable[[Series, str], Series],
    dtypes: Mapping[str, str],
) -> DataFrame:
    """
    Cleans data frame with the appropriate steps to prepare loading the data frame
    to the target database.

    Args:
        df (DataFrame): Data frame to clean.
        column_mapper (Callable[[Series, str], str]): Function that cleans a column given the
        pandas data type.
        dtypes (Mapping[str, str]): Name of the new table to create

    Returns:
        str: Table creation query for this table.
    """
    copy_df = df.copy()

    columns = []
    if type(df) is DataFrame:
        columns = df.columns
    elif type(df) is dict:
        columns = df.keys()

    for column in columns:
        copy_df[column] = column_mapper(copy_df[column], dtypes[column])
    return copy_df


def gen_table_creation_query(
    dtypes: Mapping[str, str],
    schema_name: str,
    table_name: str,
    case_sensitive: bool = False,
    unique_constraints: List[str] = None,
    overwrite_types: Dict = None,
) -> str:
    """
    Generates a database table creation query from a data frame.

    Args:
        dtypes (Mapping[str, str]): Database relative data types for each column of
        the data frame.
        schema_name (str): Name of schema to create new table in.
        table_name (str): Name of the new table to create.

    Returns:
        str: Table creation query for this table.
    """
    if unique_constraints is None:
        unique_constraints = []
    query = []
    if overwrite_types is not None:

        for cname in dtypes:
            if cname in overwrite_types.keys():
                dtypes[cname] = overwrite_types[cname]

            query.append(f'"{clean_name(cname, case_sensitive=case_sensitive)}" {dtypes[cname]}')
    else:
        for cname in dtypes:
            query.append(f'"{clean_name(cname, case_sensitive=case_sensitive)}" {dtypes[cname]}')

    if schema_name:
        full_table_name = f'{schema_name}.{table_name}'
    else:
        full_table_name = table_name

    if unique_constraints:
        unique_constraints_clean = []
        for col in unique_constraints:
            unique_constraints_clean.append(clean_name(col, case_sensitive=case_sensitive))
        unique_constraints_escaped = [f'"{col}"'
                                      for col in unique_constraints_clean]
        index_name = '_'.join([
            clean_name(full_table_name, case_sensitive=case_sensitive),
        ] + unique_constraints_clean)
        index_name = f'unique{index_name}'[:64]
        query.append(
            f"CONSTRAINT {index_name} UNIQUE ({', '.join(unique_constraints_escaped)})",
        )
    return f'CREATE TABLE {full_table_name} (' + ','.join(query) + ');'
