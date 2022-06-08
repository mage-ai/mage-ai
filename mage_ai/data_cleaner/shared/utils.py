from mage_ai.data_cleaner.column_type_detector import (
    NUMBER,
    NUMBER_WITH_DECIMALS,
    DATETIME,
    PHONE_NUMBER,
    ZIP_CODE,
)
from mage_ai.data_cleaner.transformer_actions.constants import CURRENCY_SYMBOLS
import pandas as pd
import numpy as np

COLUMN_NAME_QUOTE_CHARS = '+=-*&^%$! ?~|<>(){}[],.'


def clean_series(series, column_type, dropna=True):
    series_cleaned = series.apply(lambda x: x.strip(' \'\"') if type(x) is str else x)
    series_cleaned = series_cleaned.map(
        lambda x: x if (not isinstance(x, str) or (len(x) > 0 and not x.isspace())) else np.nan
    )
    if dropna:
        series_cleaned = series_cleaned.dropna()

    if series_cleaned.count() == 0:
        return series_cleaned

    dtype = type(series_cleaned.dropna().iloc[0])
    if column_type == NUMBER or column_type == NUMBER_WITH_DECIMALS:
        is_percent = False
        if dtype is str:
            series_cleaned = series_cleaned.str.replace(',', '')
            if series_cleaned.str.count(CURRENCY_SYMBOLS).sum() != 0:
                series_cleaned = series_cleaned.str.replace(CURRENCY_SYMBOLS, '')
            elif series_cleaned.str.contains('%').sum() != 0:
                is_percent = True
                series_cleaned = series_cleaned.str.replace('%', '')
            series_cleaned = series_cleaned.str.replace(' ', '')
        if column_type == NUMBER:
            try:
                series_cleaned = series_cleaned.astype(int)
            except ValueError:
                series_cleaned = series_cleaned.astype(float)
        else:
            series_cleaned = series_cleaned.astype(float)
        if is_percent:
            series_cleaned /= 100
    elif column_type == DATETIME:
        series_cleaned = pd.to_datetime(series_cleaned, errors='coerce', infer_datetime_format=True)
    elif column_type == PHONE_NUMBER and dtype is not str:
        series_cleaned = series_cleaned.astype(str)
        series_cleaned = series_cleaned.str.replace(r'\.\d*', '')
    elif column_type == ZIP_CODE and dtype is not str:
        series_cleaned = series_cleaned.astype(str)
    return series_cleaned


def clean_dataframe(df, column_types, dropna=True):
    return df.apply(lambda col: clean_series(col, column_types[col.name], dropna=dropna), axis=0)


def is_numeric_dtype(df, column, column_type):
    return column_type in [NUMBER, NUMBER_WITH_DECIMALS] or issubclass(
        df[column].dtype.type, np.number
    )


def wrap_column_name(name: str) -> str:
    if any(symbol in name for symbol in COLUMN_NAME_QUOTE_CHARS):
        name = f'"{name}"'
    return name
