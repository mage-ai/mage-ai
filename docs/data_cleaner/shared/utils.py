from mage_ai.data_cleaner.column_types.constants import NUMBER_TYPES, ColumnType
from mage_ai.data_cleaner.transformer_actions.constants import CURRENCY_SYMBOLS
from mage_ai.shared.custom_types import FrozenDict
from pandas.core.indexes.frozen import FrozenList
from typing import Any, List, Union
import pandas as pd
import numpy as np
import re

COLUMN_NAME_QUOTE_CHARS = '+=-*&^%$! ?~|<>(){}[],.'
LIST_SPLIT = re.compile(r'\s*,\s*')
LIST_TYPES = frozenset([list, set, tuple])
NONE_TYPES = frozenset([None, np.nan])
PAREN_LIKE_OPEN = frozenset(['[', '('])
PAREN_LIKE_CLOSE = frozenset([']', ')'])


def clean_series(series, column_type, dropna=True):
    if series.dtype == 'object':
        series_cleaned = series.apply(lambda x: x.strip(' \'\"') if type(x) is str else x)
        series_cleaned = series_cleaned.map(
            lambda x: x if (not isinstance(x, str) or x != '') else np.nan
        )
    else:
        series_cleaned = series
    if dropna:
        series_cleaned = series_cleaned.dropna()

    if series_cleaned.count() == 0:
        return series_cleaned

    dtype = type(series_cleaned.dropna().iloc[0])
    if column_type == ColumnType.NUMBER or column_type == ColumnType.NUMBER_WITH_DECIMALS:
        is_percent = False
        if dtype is str:
            series_cleaned = series_cleaned.str.replace(',', '')
            if series_cleaned.str.count(CURRENCY_SYMBOLS).sum() != 0:
                series_cleaned = series_cleaned.str.replace(CURRENCY_SYMBOLS, '')
            elif series_cleaned.str.contains('%').sum() != 0:
                is_percent = True
                series_cleaned = series_cleaned.str.replace('%', '')
            series_cleaned = series_cleaned.str.replace(' ', '')
        if column_type == ColumnType.NUMBER:
            try:
                series_cleaned = series_cleaned.astype(int)
            except ValueError:
                series_cleaned = series_cleaned.astype(float)
        else:
            series_cleaned = series_cleaned.astype(float)
        if is_percent:
            series_cleaned /= 100
    elif column_type == ColumnType.DATETIME:
        series_cleaned = pd.to_datetime(series_cleaned, errors='coerce', infer_datetime_format=True)
    elif column_type == ColumnType.PHONE_NUMBER and dtype is not str:
        series_cleaned = series_cleaned.astype(str)
        series_cleaned = series_cleaned.str.replace(r'\.\d*', '', regex=True)
    elif column_type == ColumnType.ZIP_CODE and dtype is not str:
        series_cleaned = series_cleaned.astype(str)
    elif column_type == ColumnType.LIST:
        series_cleaned = series_cleaned.apply(parse_list)
    return series_cleaned


def clean_dataframe(df, column_types, dropna=True):
    return df.apply(lambda col: clean_series(col, column_types[col.name], dropna=dropna))


def is_dataframe(df):
    return type(df) is pd.DataFrame or is_spark_dataframe(df) or is_geo_dataframe(df)


def is_numeric_dtype(df, column, column_type):
    return column_type in NUMBER_TYPES or issubclass(df[column].dtype.type, np.number)


def is_geo_dataframe(df):
    return type(df).__module__ == 'geopandas.geodataframe' and type(df).__name__ == 'GeoDataFrame'


def is_spark_dataframe(df):
    return type(df).__module__ == 'pyspark.sql.dataframe'


def __parse_element(element: str) -> Any:
    if element == 'nan' or element == 'np.nan':
        return np.nan
    else:
        try:
            return __resolve_type(eval(element))
        except:
            return None


def __resolve_type(element: Any) -> Any:
    if isinstance(element, dict):
        return FrozenDict(element)
    return element


def parse_list(list_literal: Union[str, List[Any]]) -> FrozenList:
    dtype = type(list_literal)
    if dtype is FrozenList:
        return list_literal
    elif dtype in LIST_TYPES:
        return FrozenList([__resolve_type(literal) for literal in list_literal])
    elif list_literal in NONE_TYPES:
        return list_literal
    elif dtype is not str:
        return FrozenList([list_literal])
    if list_literal[0] not in PAREN_LIKE_OPEN or list_literal[-1] not in PAREN_LIKE_CLOSE:
        return list_literal
    list_literal = list_literal.strip('[]() ')
    if list_literal == '':
        return FrozenList([])
    return FrozenList([__parse_element(element) for element in LIST_SPLIT.split(list_literal)])


def wrap_column_name(name: str) -> str:
    if any(symbol in name for symbol in COLUMN_NAME_QUOTE_CHARS):
        name = f'"{name}"'
    return name
