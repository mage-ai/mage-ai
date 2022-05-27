from data_cleaner.column_type_detector import (
    NUMBER,
    NUMBER_WITH_DECIMALS,
)
from data_cleaner.column_type_detector import DATETIME
import pandas as pd
import numpy as np
import time


def clean_series(series, column_type, dropna=True):
    series_cleaned = series.map(
        lambda x: x if (not isinstance(x, str) or (len(x) > 0 and not x.isspace())) else np.nan,
    )
    if dropna:
        series_cleaned = series_cleaned.dropna()

    first_item = series_cleaned.dropna().iloc[0]
    if column_type == NUMBER:
        if type(first_item) is str:
            series_cleaned = series_cleaned.str.replace(',', '')
        try:
            series_cleaned = series_cleaned.astype(float).astype(int)
        except ValueError:
            series_cleaned = series_cleaned.astype(float)
    elif column_type == NUMBER_WITH_DECIMALS:
        if type(first_item) is str:
            series_cleaned = series_cleaned.str.replace(',', '')
        series_cleaned = series_cleaned.astype(float)
    elif column_type == DATETIME and type(first_item) is str:
        series_cleaned = pd.to_datetime(series, infer_datetime_format=True, errors='coerce')

    return series_cleaned


def clean_dataframe(df, column_types, dropna=True):
    return df.apply(
        lambda col: clean_series(col, column_types[col.name], dropna=dropna), 
        axis=0
    )


class timer(object):
    """
    with timer('metric.metric', tags={ 'key': 'value' }):
        function()
    """
    def __init__(self, metric, tags={}):
        self.metric = metric
        self.start = None
        self.tags = tags

    def __enter__(self):
        self.start = time.time()

    def __exit__(self, type, value, traceback):
        # Must convert to milliseconds, see details in
        # https://statsd.readthedocs.io/en/v3.1/timing.html
        dt = int((time.time() - self.start) * 1000)
        print(f'[time] metric: {self.metric}, value: {dt}ms, tags: {self.tags}')
