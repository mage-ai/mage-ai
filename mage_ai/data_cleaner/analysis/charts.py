from mage_ai.data_cleaner.analysis.constants import (
    CHART_TYPE_BAR_HORIZONTAL,
    CHART_TYPE_LINE_CHART,
    CHART_TYPE_HISTOGRAM,
    DATA_KEY_SCATTER_PLOT,
    DATA_KEY_SCATTER_PLOT_LABELS,
    DATA_KEY_TIME_SERIES,
    LABEL_TYPE_RANGE,
)
from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.data_cleaner.estimators.encoders import MultipleColumnLabelEncoder
import math
import numpy as np
import pandas as pd

DD_KEY = 'lambda.analysis_charts'
BUCKETS = 40
SCATTER_PLOT_SAMPLE_COUNT = 200
SCATTER_PLOT_CATEGORY_LIMIT = 10
TIME_SERIES_BUCKETS = 40


def increment(metric, tags={}):
    pass


def build_buckets(min_value, max_value, max_buckets, column_type):
    diff = max_value - min_value
    total_interval = 1 + diff
    bucket_interval = total_interval / max_buckets
    number_of_buckets = max_buckets

    if diff < 0.0001:
        diff = 0

    is_integer = False
    parts = str(diff).split('.')
    if len(parts) == 1:
        is_integer = True
    else:
        is_integer = int(parts[1]) == 0

    if ColumnType.NUMBER == column_type and total_interval <= max_buckets and is_integer:
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
        buckets.append(
            dict(
                max_value=max_v,
                min_value=min_v,
                values=[],
            )
        )

    return buckets, bucket_interval


def build_histogram_data(col1, series, column_type):
    increment(f'{DD_KEY}.build_histogram_data.start', dict(feature_uuid=col1))

    max_value = series.max()
    min_value = series.min()

    buckets, bucket_interval = build_buckets(min_value, max_value, BUCKETS, column_type)

    if bucket_interval == 0:
        return

    bins = [b['min_value'] for b in buckets] + [buckets[-1]['max_value']]
    count, _ = np.histogram(series, bins=bins)

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

    increment(f'{DD_KEY}.build_histogram_data.succeeded', dict(feature_uuid=col1))

    return dict(
        type=CHART_TYPE_HISTOGRAM,
        x=x,
        x_metadata=dict(
            label_type=LABEL_TYPE_RANGE,
        ),
        y=y,
    )


def build_correlation_data(df):
    charts = dict()
    df_corr = df.corr()
    columns = df_corr.columns
    for col1 in columns:
        x = []
        y = []
        for col2 in columns:
            if col1 != col2:
                value = df_corr[col1].get(col2, None)
                if value is not None:
                    x.append(dict(label=col2))
                    y.append(dict(value=value))
        charts[col1] = [dict(
            type=CHART_TYPE_BAR_HORIZONTAL,
            x=x,
            y=y,
        )]
    return charts


def build_time_series_data(df, features, datetime_column):
    # print(feature, datetime_column)

    datetimes = df[datetime_column].dropna()
    if datetimes.size <= 1:
        return

    # datetimes = pd.to_datetime(datetimes, infer_datetime_format=True, errors='coerce')

    min_value_datetime = datetimes.min().timestamp()
    max_value_datetime = datetimes.max().timestamp()

    buckets, bucket_interval = build_buckets(
        min_value_datetime,
        max_value_datetime,
        TIME_SERIES_BUCKETS,
        ColumnType.DATETIME,
    )

    x = []
    y_dict = dict()

    df_copy = df.copy()
    df_copy[datetime_column] = datetimes.view(int) / 10**9

    for bucket in buckets:
        max_value = bucket['max_value']
        min_value = bucket['min_value']

        df_filtered = df_copy[
            (df_copy[datetime_column] >= min_value) & (df_copy[datetime_column] < max_value)
        ]

        x.append(
            dict(
                max=max_value,
                min=min_value,
            )
        )

        series_count = df_filtered.shape[0]
        for f in features:
            col = f['uuid']
            column_type = f['column_type']
            if col not in y_dict:
                y_dict[col] = []

            series = df_filtered[col]
            # series_cleaned = clean_series(series, column_type, dropna=False)
            series_cleaned = series
            series_non_null = series_cleaned.dropna()
            non_null_count = series_non_null.size

            y_data = dict(
                count=non_null_count,
                count_distinct=series_non_null.nunique(),
                null_value_rate=0
                if series_count == 0
                else (series_count - non_null_count) / series_count,
            )

            if column_type in [ColumnType.NUMBER, ColumnType.NUMBER_WITH_DECIMALS]:
                if len(series_non_null) == 0:
                    average = 0
                else:
                    average = series_non_null.mean()
                y_data.update(
                    dict(
                        average=average,
                        max=series_non_null.max(),
                        median=series_non_null.median(),
                        min=series_non_null.min(),
                        sum=series_non_null.sum(),
                    )
                )
            elif column_type in [
                ColumnType.CATEGORY,
                ColumnType.CATEGORY_HIGH_CARDINALITY,
                ColumnType.TRUE_OR_FALSE,
            ]:
                value_counts = series_non_null.value_counts()
                if len(value_counts.index):
                    value_counts_top = value_counts.iloc[:12]
                    mode = value_counts_top.index[0]
                    y_data.update(
                        dict(
                            mode=mode,
                            value_counts=value_counts_top.to_dict(),
                        )
                    )

            y_dict[col].append(y_data)
    charts = dict()
    for f, y in y_dict.items():
        charts[f] = dict(
            type=CHART_TYPE_LINE_CHART,
            x=x,
            x_metadata=dict(
                label=datetime_column,
                label_type=LABEL_TYPE_RANGE,
            ),
            y=y,
        )
    return charts


def build_overview_data(
    df,
    datetime_features,
    numeric_features,
):
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
            df[datetime_column], infer_datetime_format=True, errors='coerce'
        )
        df_copy[datetime_column] = df_copy[datetime_column].view(int) / 10**9

        min_value1 = df_copy[datetime_column].min()
        max_value1 = df_copy[datetime_column].max()
        buckets, bucket_interval = build_buckets(
            min_value1, max_value1, TIME_SERIES_BUCKETS, column_type
        )

        x = []
        y = []

        for bucket in buckets:
            max_value = bucket['max_value']
            min_value = bucket['min_value']

            df_filtered = df_copy[
                (df_copy[datetime_column] >= min_value) & (df_copy[datetime_column] < max_value)
            ]

            x.append(
                dict(
                    max=max_value,
                    min=min_value,
                )
            )

            y.append(
                dict(
                    count=len(df_filtered.index),
                )
            )

        time_series.append(
            dict(
                type=CHART_TYPE_LINE_CHART,
                x=x,
                x_metadata=dict(
                    label=datetime_column,
                    label_type=LABEL_TYPE_RANGE,
                ),
                y=y,
            )
        )

        increment(f'{DD_KEY}.build_overview_time_series.succeeded', tags)

    """
    Build sample data for scatter plot. Sample data consits of two parts:
    1. Numeric features
    2. Low cardinality categorical features
    """
    if df.shape[0] > SCATTER_PLOT_SAMPLE_COUNT:
        df_sample = df.sample(SCATTER_PLOT_SAMPLE_COUNT).copy()
    else:
        df_sample = df.copy()

    df_sample_numeric = df_sample[numeric_features].dropna(axis=1, how='all')
    """
    Calculate low cardinality categorical features:
    1. unique count <= SCATTER_PLOT_CATEGORY_LIMIT and unique count > 1
    2. count > SCATTER_PLOT_SAMPLE_COUNT / 2
    """
    non_numeric_features = list(set(df.columns) - set(numeric_features))
    non_numeric_nuniques = df_sample[non_numeric_features].nunique()
    non_numeric_nuniques_filtered = non_numeric_nuniques[
        (non_numeric_nuniques <= SCATTER_PLOT_CATEGORY_LIMIT) & (non_numeric_nuniques > 1)
    ]
    non_numeric_counts = df_sample[non_numeric_features].count()
    sample_count = df_sample.shape[0]
    non_numeric_counts_filtered = non_numeric_counts[non_numeric_counts > sample_count / 2]
    eligible_category_features = set(non_numeric_nuniques_filtered.index) & set(
        non_numeric_counts_filtered.index
    )
    if len(eligible_category_features) > 0:
        encoder = MultipleColumnLabelEncoder(input_type=str)
        df_sample_category = encoder.fit_transform(df_sample[eligible_category_features])
        class_mappings = {k: list(e.label_classes()) for k, e in encoder.encoders.items()}
        df_sample_filtered = pd.concat([df_sample_numeric, df_sample_category], axis=1)
    else:
        class_mappings = dict()
        df_sample_filtered = df_sample_numeric

    increment(f'{DD_KEY}.build_overview_data.succeeded')

    return {
        DATA_KEY_TIME_SERIES: time_series,
        DATA_KEY_SCATTER_PLOT: df_sample_filtered.to_dict('list'),
        DATA_KEY_SCATTER_PLOT_LABELS: class_mappings,
    }
