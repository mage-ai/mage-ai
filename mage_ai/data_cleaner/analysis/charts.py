from mage_ai.data_cleaner.analysis.constants import (
    CHART_TYPE_BAR_HORIZONTAL,
    CHART_TYPE_LINE_CHART,
    CHART_TYPE_HISTOGRAM,
    DATA_KEY_TIME_SERIES,
    LABEL_TYPE_RANGE,
)
from mage_ai.data_cleaner.shared.utils import clean_series
from mage_ai.data_cleaner.column_type_detector import (
    CATEGORY,
    CATEGORY_HIGH_CARDINALITY,
    DATETIME,
    NUMBER,
    NUMBER_WITH_DECIMALS,
    TRUE_OR_FALSE,
)
import math
import numpy as np
import pandas as pd

DD_KEY = 'lambda.analysis_charts'
BUCKETS = 40
TIME_SERIES_BUCKETS = 40


def increment(metric, tags={}):
    pass


def build_buckets(min_value, max_value, max_buckets, column_type):
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

    if NUMBER == column_type and total_interval <= max_buckets and is_integer:
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
        buckets.append(dict(
            max_value=max_v,
            min_value=min_v,
            values=[],
        ))

    return buckets, bucket_interval


def build_histogram_data(col1, series, column_type):
    increment(f'{DD_KEY}.build_histogram_data.start', dict(feature_uuid=col1))

    max_value = series.max()
    min_value = series.min()

    buckets, bucket_interval = build_buckets(min_value, max_value, BUCKETS, column_type)

    if bucket_interval == 0:
        return

    for value in series.values:
        index = math.floor((value - min_value) / bucket_interval)
        if value == max_value:
            index = len(buckets) - 1
        buckets[index]['values'].append(value)

    x = []
    y = []

    for bucket in buckets:
        x.append(dict(
            max=bucket['max_value'],
            min=bucket['min_value'],
        ))
        y.append(dict(value=len(bucket['values'])))

    increment(f'{DD_KEY}.build_histogram_data.succeeded', dict(feature_uuid=col1))

    return dict(
        type=CHART_TYPE_HISTOGRAM,
        x=x,
        x_metadata=dict(
            label_type=LABEL_TYPE_RANGE,
        ),
        y=y,
    )


def build_correlation_data(df, col1, features):
    increment(f'{DD_KEY}.build_correlation_data.start', dict(feature_uuid=col1))

    x = []
    y = []

    df_copy = df.copy()
    # for feature in features:
    #     col2 = feature['uuid']
    #     column_type = feature['column_type']
    #     series = df_copy[col2]
    #     df_copy[col2] = clean_series(series, column_type, dropna=False)

    corr = df_copy.corr()
    for feature in features:
        col2 = feature['uuid']
        if col1 != col2:
            value = corr[col1].get(col2, None)

            if value is not None:
                x.append(dict(label=col2))
                y.append(dict(value=value))

    increment(f'{DD_KEY}.build_correlation_data.succeeded', dict(feature_uuid=col1))

    return dict(
        type=CHART_TYPE_BAR_HORIZONTAL,
        x=x,
        y=y,
    )


def build_time_series_data(df, feature, datetime_column, column_type):
    col1 = feature['uuid']
    column_type = feature['column_type']
    tags = dict(
        column_type=column_type,
        datetime_column=datetime_column,
        feature_uuid=col1,
    )

    increment(f'{DD_KEY}.build_time_series_data.start', tags)

    # print(feature, datetime_column)

    datetimes = df[datetime_column].dropna()
    if datetimes.size <= 1:
        return

    datetimes = pd.to_datetime(datetimes, infer_datetime_format=True, errors='coerce')

    min_value_datetime = datetimes.min().timestamp()
    max_value_datetime = datetimes.max().timestamp()

    buckets, bucket_interval = build_buckets(
        min_value_datetime,
        max_value_datetime,
        TIME_SERIES_BUCKETS,
        column_type,
    )

    x = []
    y = []

    df_copy = df.copy()
    df_copy[datetime_column] = datetimes.apply(lambda x: x if pd.isnull(x) else x.timestamp())

    for bucket in buckets:
        max_value = bucket['max_value']
        min_value = bucket['min_value']

        series = df_copy[(
            df_copy[datetime_column] >= min_value
        ) & (
            df_copy[datetime_column] < max_value
        )][col1]

        x.append(dict(
            max=max_value,
            min=min_value,
        ))

        # series_cleaned = clean_series(series, column_type, dropna=False)
        series_cleaned = series
        df_value_counts = series_cleaned.value_counts(dropna=False)
        series_non_null = series_cleaned.dropna()
        count_unique = len(df_value_counts.index)

        y_data = dict(
            count=series_non_null.size,
            count_distinct=count_unique - 1 if np.nan in df_value_counts else count_unique,
            null_value_rate=0 if series_cleaned.size == 0 else series_cleaned.isnull().sum() / series_cleaned.size,
        )

        if column_type in [NUMBER, NUMBER_WITH_DECIMALS]:
            if len(series_non_null) == 0:
                average = 0
            else:
                average = series_non_null.sum() / len(series_non_null)
            y_data.update(dict(
                average=average,
                max=series_non_null.max(),
                median=series_non_null.quantile(0.5),
                min=series_non_null.min(),
                sum=series_non_null.sum(),
            ))
        elif column_type in [CATEGORY, CATEGORY_HIGH_CARDINALITY, TRUE_OR_FALSE]:
            value_counts = series_non_null.value_counts()
            if len(value_counts.index):
                value_counts_top = value_counts.sort_values(ascending=False).iloc[:12]
                mode = value_counts_top.index[0]
                y_data.update(dict(
                    mode=mode,
                    value_counts=value_counts_top.to_dict(),
                ))

        y.append(y_data)

    increment(f'{DD_KEY}.build_time_series_data.succeeded', tags)

    return dict(
        type=CHART_TYPE_LINE_CHART,
        x=x,
        x_metadata=dict(
            label=datetime_column,
            label_type=LABEL_TYPE_RANGE,
        ),
        y=y,
    )


def build_overview_data(df, datetime_features):
    increment(f'{DD_KEY}.build_overview_data.start')

    time_series = []
    df_copy = df.copy()

    for feature in datetime_features:
        column_type = feature['column_type']
        datetime_column = feature['uuid']
        tags = dict(datetime_column=datetime_column)
        increment(f'{DD_KEY}.build_overview_time_series.start', tags)

        if df_copy[datetime_column].count() <= 1:
            continue

        df_copy[datetime_column] = pd.to_datetime(
            df[datetime_column],
            infer_datetime_format=True,
            errors='coerce'
        )
        df_copy[datetime_column] = df_copy[datetime_column].apply(
            lambda x: x if pd.isnull(x) else x.timestamp()
        )

        min_value1 = df_copy[datetime_column].min()
        max_value1 = df_copy[datetime_column].max()
        buckets, bucket_interval = build_buckets(min_value1, max_value1, TIME_SERIES_BUCKETS, column_type)

        x = []
        y = []

        for bucket in buckets:
            max_value = bucket['max_value']
            min_value = bucket['min_value']

            df_filtered = df_copy[(
                df_copy[datetime_column] >= min_value
            ) & (
                df_copy[datetime_column] < max_value
            )]

            x.append(dict(
                max=max_value,
                min=min_value,
            ))

            y.append(dict(
                count=len(df_filtered.index),
            ))

        time_series.append(dict(
            type=CHART_TYPE_LINE_CHART,
            x=x,
            x_metadata=dict(
                label=datetime_column,
                label_type=LABEL_TYPE_RANGE,
            ),
            y=y,
        ))

        increment(f'{DD_KEY}.build_overview_time_series.succeeded', tags)

    increment(f'{DD_KEY}.build_overview_data.succeeded')

    return {
        DATA_KEY_TIME_SERIES: time_series,
    }
