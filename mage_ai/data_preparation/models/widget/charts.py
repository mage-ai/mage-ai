import math
from datetime import datetime, timedelta

import dateutil.parser
import numpy as np
import pandas as pd
from dateutil.relativedelta import relativedelta

from mage_ai.shared.strings import is_number

from .constants import TIME_INTERVAL_TO_TIME_DELTA, TimeInterval
from .utils import calculate_metric_for_series, clean_series

MAX_BUCKETS = 40
TIME_SERIES_BUCKETS = 40


def build_buckets(min_value, max_value, max_buckets):
    if not is_number(min_value) or not is_number(max_value):
        return [], 0

    diff = max_value - min_value
    total_interval = 1 + diff
    bucket_interval = total_interval / max_buckets
    number_of_buckets = max_buckets

    is_integer = False
    parts = str(diff).split('.')
    if len(parts) == 1:
        is_integer = True
    else:
        is_integer = int(parts[1]) == 0

    if is_integer and total_interval <= max_buckets:
        number_of_buckets = int(total_interval)
        bucket_interval = 1
    elif bucket_interval > 1:
        bucket_interval = math.ceil(bucket_interval)
    else:
        bucket_interval = round(bucket_interval * 100, 1) / 100

    buckets = []
    for i in range(number_of_buckets):
        min_v = min_value + (i * bucket_interval)
        max_v = min_value + ((i + 1) * bucket_interval)
        if max_value >= min_v:
            buckets.append(
                dict(
                    max_value=max_v,
                    min_value=min_v,
                    values=[],
                )
            )

    return buckets, bucket_interval


def build_histogram_data(arr, max_buckets):
    max_value = max(arr) if len(arr) >= 1 else None
    min_value = min(arr) if len(arr) >= 1 else None

    buckets, bucket_interval = build_buckets(min_value, max_value, max_buckets)

    if bucket_interval == 0:
        return

    bins = [b['min_value'] for b in buckets] + [buckets[-1]['max_value']]
    count, _ = np.histogram(arr, bins=bins)

    x = []
    y = []

    for idx, bucket in enumerate(buckets):
        x.append(
            dict(
                max=bucket['max_value'],
                min=bucket['min_value'],
            )
        )
        y.append(dict(value=count[idx]))

    return dict(
        x=x,
        y=y,
    )


def convert_to_datetime(dt):
    if len(str(dt)) == 10 and str(dt).isdigit():
        return datetime.fromtimestamp(int(dt))
    elif type(dt) is np.datetime64:
        return pd.to_datetime(dt.astype(datetime)).to_pydatetime()
    return dt


def build_time_series_buckets(
    df,
    datetime_column,
    time_interval,
    metrics,
    max_buckets: int = None,
):
    time_values = df[datetime_column]
    datetimes = clean_series(time_values)
    if datetimes.size <= 1:
        return []

    datetimes = datetimes.unique()
    datetimes_are_timestamps = all([len(str(dt)) == 10 and str(dt).isdigit() for dt in datetimes])
    min_value_datetime = convert_to_datetime(datetimes.min())
    max_value_datetime = convert_to_datetime(datetimes.max())

    if type(min_value_datetime) is str:
        min_value_datetime = dateutil.parser.parse(min_value_datetime)
    if type(max_value_datetime) is str:
        max_value_datetime = dateutil.parser.parse(max_value_datetime)

    # If you manually convert the datetime column to a datetime, Pandas will use numpy.datetime64
    # type. This type does not have the methods year, month, day, etc that is used down below.
    datetimes_temp = [convert_to_datetime(dt) for dt in datetimes]
    datetimes = datetimes_temp
    if type(min_value_datetime) is np.datetime64:
        min_value_datetime = pd.to_datetime(min_value_datetime.astype(datetime)).to_pydatetime()
    if type(max_value_datetime) is np.datetime64:
        max_value_datetime = pd.to_datetime(max_value_datetime.astype(datetime)).to_pydatetime()

    a, b = [dateutil.parser.parse(d) if type(d) is str else d for d in sorted(datetimes)[:2]]

    year = min_value_datetime.year
    month = min_value_datetime.month
    day = min_value_datetime.day
    hour = min_value_datetime.hour
    minute = min_value_datetime.minute

    start_datetime = min_value_datetime

    if TimeInterval.ORIGINAL == time_interval:
        diff = (b - a).total_seconds()
        if diff >= 60 * 60 * 24 * 365:
            time_interval = TimeInterval.YEAR
        elif diff >= 60 * 60 * 24 * 30:
            time_interval = TimeInterval.MONTH
        elif diff >= 60 * 60 * 24 * 7:
            time_interval = TimeInterval.WEEK
        elif diff >= 60 * 60 * 24:
            time_interval = TimeInterval.DAY
        elif diff >= 60 * 60:
            time_interval = TimeInterval.HOUR
        elif diff >= 60:
            time_interval = TimeInterval.SECOND
        else:
            time_interval = TimeInterval.SECOND

    if TimeInterval.DAY == time_interval:
        start_datetime = datetime(year, month, day, 0, 0, 0)
    elif TimeInterval.HOUR == time_interval:
        start_datetime = datetime(year, month, day, hour, 0, 0)
    elif TimeInterval.MINUTE == time_interval:
        start_datetime = datetime(year, month, day, hour, minute, 0)
    elif TimeInterval.MONTH == time_interval:
        start_datetime = datetime(year, month, 1, 0, 0, 0)
    elif TimeInterval.SECOND == time_interval:
        start_datetime = datetime(year, month, day, hour, minute, 0)
    elif TimeInterval.WEEK == time_interval:
        start_datetime = min_value_datetime - relativedelta(
            days=min_value_datetime.isocalendar()[2],
        )
        start_datetime = datetime(
            start_datetime.year,
            start_datetime.month,
            start_datetime.day,
            0,
            0,
            0,
        )
    elif TimeInterval.YEAR == time_interval:
        start_datetime = datetime(year, 1, 1, 0, 0, 0)

    df_copy = df.copy()
    if datetimes_are_timestamps:
        df_copy[datetime_column] = df[datetime_column].apply(
            lambda x: x if pd.isnull(x) else int(x)
        )
    else:
        df_copy[datetime_column] = pd.to_datetime(df[datetime_column]).apply(
            lambda x: x if pd.isnull(x) else x.timestamp()
        )

    values = [[] for _ in metrics]
    buckets = []

    max_value_datetime_ts = max_value_datetime.timestamp()

    now = datetime.utcnow()
    interval_seconds = (
        now + TIME_INTERVAL_TO_TIME_DELTA[time_interval]
    ).timestamp() - now.timestamp()

    number_of_buckets = (
        math.ceil(max_value_datetime_ts - min_value_datetime.timestamp()) / interval_seconds
    )

    max_buckets_to_use = max_buckets or MAX_BUCKETS

    if number_of_buckets > max_buckets_to_use:
        time_interval_factor = number_of_buckets / max_buckets_to_use
    else:
        time_interval_factor = 1

    while len(buckets) == 0 or buckets[-1] <= max_value_datetime_ts:
        if len(buckets) == 0:
            min_date_ts = start_datetime.timestamp()
        else:
            min_date_ts = buckets[-1]

        max_date = datetime.fromtimestamp(min_date_ts) + timedelta(
            seconds=interval_seconds * time_interval_factor,
        )
        buckets.append(max_date.timestamp())

        df_in_range = df_copy[
            (df_copy[datetime_column] >= min_date_ts)
            & (df_copy[datetime_column] < max_date.timestamp())
        ]

        for idx, metric in enumerate(metrics):
            aggregation = metric['aggregation']
            column = metric['column']
            series = df_in_range[column]
            values[idx].append(calculate_metric_for_series(series, aggregation))

    return buckets, values
