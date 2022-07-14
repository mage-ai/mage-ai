from enum import Enum
from pandas.api.types import infer_dtype
from pandas import DataFrame, Series
from typing import Callable, Dict
import numpy as np

"""
Utilities for managing type conversions between Python data frames and external databases.
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
    FLOATING = 'floating'
    MIXED = 'mixed'
    MIXED_INTEGER = 'mixed=integer'
    MIXED_INTEGER_FLOAT = 'mixed-integer-float'
    PERIOD = 'period'
    STRING = 'string'
    TIME = 'time'
    TIMEDELTA64 = 'timedelta64'
    TIMEDELTA = 'timedelta'
    UNKNOWN_ARRAY = 'unknown-array'


def infer_dtypes(df: DataFrame) -> Dict[str, str]:
    """
    Fetches the internal pandas datatypes for the columns in the data frame.

    Args:
        df (DataFrame): Data frame to fetch dtypes from.

    Returns:
        Dict[str, str]: Map of column names to inferred dtypes
    """
    return {column: infer_dtype(df[column], skipna=True) for column in df.columns}


def map_to_postgres(column: Series, dtype: str) -> str:
    """
    Maps pandas Data Frame column to PostgreSQL type

    Args:
        series (Series): Column to map
        dtype (str): Pandas data type of this column

    Raises:
        ConversionError: Returned if this type cannot be converted to a PostgreSQL data type

    Returns:
        str: PostgreSQL data type for this column
    """
    if dtype in (
        PandasTypes.MIXED,
        PandasTypes.UNKNOWN_ARRAY,
        PandasTypes.COMPLEX,
    ):
        raise BadConversionError(f'Cannot convert {dtype} to a PostgreSQL datatype.')
    elif dtype in (PandasTypes.DATETIME, PandasTypes.DATETIME64):
        try:
            if column.dt.tz:
                return 'timestamptz'
        except AttributeError:
            pass
        return 'timestamp'
    elif dtype == PandasTypes.TIME:
        try:
            if column.dt.tz:
                return 'timetz'
        except AttributeError:
            pass
        return 'time'
    elif dtype == PandasTypes.DATE:
        return 'date'
    elif dtype == PandasTypes.STRING:
        return 'text'
    elif dtype == PandasTypes.CATEGORICAL:
        return 'text'
    elif dtype == PandasTypes.BYTES:
        return 'bytea'
    elif dtype in (PandasTypes.FLOATING, PandasTypes.DECIMAL, PandasTypes.MIXED_INTEGER_FLOAT):
        return 'double precision'
    elif dtype == PandasTypes.INTEGER:
        max_int, min_int = column.max(), column.min()
        if np.int16(max_int) == max_int and np.int16(min_int) == min_int:
            return 'smallint'
        elif np.int32(max_int) == max_int and np.int32(min_int) == min_int:
            return 'integer'
        else:
            return 'bigint'
    elif dtype == PandasTypes.BOOLEAN:
        return 'boolean'
    elif dtype in (PandasTypes.TIMEDELTA, PandasTypes.TIMEDELTA64, PandasTypes.PERIOD):
        return 'bigint'
    else:
        raise ValueError(f'Invalid datatype provided: {dtype}')


def gen_table_creation_query(
    df: DataFrame,
    type_mapper: Callable[[Series], str],
    table_name: str,
) -> str:
    """
    Generates a database table creation query from a data frame.

    Args:
        df (DataFrame): Data frame to generate a table creation query for.
        type_mapper (Callable[[Series, str], str]):  Function that maps columns of data frame
        to the database datatype
        table_name (str): Name of the new table to create

    Returns:
        str: Table creation query for this table.
    """
    dtypes = infer_dtypes(df)
    query = []
    for cname in dtypes:
        psql_type = type_mapper(df[cname], dtypes[cname])
        query.append(f'{cname} {psql_type}')
    return f'CREATE TABLE {table_name} (' + ','.join(query) + ');'
