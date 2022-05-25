from data_cleaner.column_type_detector import (
    NUMBER,
    NUMBER_WITH_DECIMALS,
)
import numpy as np
import time


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
