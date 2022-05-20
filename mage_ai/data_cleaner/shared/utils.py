from data_cleaner.column_type_detector import (
    NUMBER,
    NUMBER_WITH_DECIMALS,
)
import numpy as np


def clean_series(series, column_type, dropna=True):
    series_cleaned = series.map(
        lambda x: x if (not isinstance(x, str) or (len(x) > 0 and not x.isspace())) else np.nan,
    )
    if dropna:
        series_cleaned = series_cleaned.dropna()

    if column_type == NUMBER:
        try:
            series_cleaned = series_cleaned.astype(float).astype(int)
        except ValueError:
            series_cleaned = series_cleaned.astype(float)
    elif column_type == NUMBER_WITH_DECIMALS:
        series_cleaned = series_cleaned.astype(float)

    return series_cleaned
