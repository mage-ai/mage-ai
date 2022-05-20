from data_cleaner.shared.hash import merge_dict
from data_cleaner.shared.multi import run_parallel
from data_cleaner.column_type_detector import (
    DATETIME,
    NUMBER,
    NUMBER_TYPES,
    NUMBER_WITH_DECIMALS,
)
import math
import numpy as np
import pandas as pd
import traceback


VALUE_COUNT_LIMIT = 255


def increment(metric, tags):
    pass


class timer(object):
    """
    with timer('metric.metric', tags={ 'key': 'value' }):
        function()
    """
    def __init__(self, metric, tags={}):
        pass

    def __enter__(self):
        pass

    def __exit__(self, type, value, traceback):
        pass


class StatisticsCalculator():
    def __init__(
        self,
        # s3_client,
        # object_key_prefix,
        # feature_set_version,
        column_types,
        **kwargs,
    ):
        self.column_types = column_types

    @property
    def data_tags(self):
        return dict()

    def process(self, df):
        return self.calculate_statistics_overview(df)

    def calculate_statistics_overview(self, df):
        increment(
            'lambda.transformer_actions.calculate_statistics_overview.start',
            self.data_tags,
        )

        with timer(
            'lambda.transformer_actions.calculate_statistics_overview.time',
                self.data_tags):
            data = dict(count=len(df.index))

            arr_args_1 = [df[col] for col in df.columns],
            arr_args_2 = [col for col in df.columns],

            dicts = run_parallel(self.statistics_overview, arr_args_1, arr_args_2)

            for d in dicts:
                data.update(d)

            # object_key = s3_paths.path_statistics_overview(self.object_key_prefix)
            # s3_data.upload_json_sorted(self.s3_client, object_key, data)

        increment(
            'lambda.transformer_actions.calculate_statistics_overview.success',
            self.data_tags,
        )

        return data

    def statistics_overview(self, series, col):
        try:
            return self.__statistics_overview(series, col)
        except Exception as err:
            increment(
                'lambda.transformer_actions.calculate_statistics_overview.column.failed',
                merge_dict(self.data_tags, {
                    'col': col,
                    'error': err.__class__.__name__,
                }),
            )
            traceback.print_exc()
            return {}

    def __statistics_overview(self, series, col):
        # The following regex based replace has high overheads
        # series = series.replace(r'^\s*$', np.nan, regex=True)
        series_cleaned = series.map(lambda x: x if (not isinstance(x, str) or
                                    (len(x) > 0 and not x.isspace())) else np.nan)
        df_value_counts = series_cleaned.value_counts(dropna=False)
        df = df_value_counts.reset_index()
        df.columns = [col, 'count']

        df_top_value_counts = df
        if df.shape[0] > VALUE_COUNT_LIMIT:
            df_top_value_counts = df.head(VALUE_COUNT_LIMIT)

        # TODO: remove duplicate data for distinct values
        # object_key_distinct_values = s3_paths.path_distinct_values_by_column(self.object_key_prefix, col)
        # s3_data.upload_dataframe(self.s3_client, df_top_value_counts, object_key_distinct_values, columns=[col])
        # object_key_statistics = s3_paths.path_statistics_by_column(self.object_key_prefix, col)
        # s3_data.upload_dataframe(self.s3_client, df_top_value_counts, object_key_statistics)

        # features = self.feature_set_version['features']
        # feature = find(lambda x: x['uuid'] == col, features)

        # if feature and feature.get('transformed'):
        #     return {}

        column_type = self.column_types.get(col)
        series_non_null = series_cleaned.dropna()

        if column_type == NUMBER:
            series_non_null = series_non_null.astype(float).astype(int)
        elif column_type == NUMBER_WITH_DECIMALS:
            series_non_null = series_non_null.astype(float)

        count_unique = len(df_value_counts.index)
        data = {
            f'{col}/count': series_non_null.size,
            f'{col}/count_distinct': count_unique - 1 if np.nan in df_value_counts else count_unique,
            f'{col}/null_value_rate': 0 if series_cleaned.size == 0 else series_cleaned.isnull().sum() / series_cleaned.size,
        }

        if len(series_non_null) == 0:
            return data

        dates = None
        if column_type in NUMBER_TYPES:
            data[f'{col}/average'] = series_non_null.sum() / len(series_non_null)
            data[f'{col}/max'] = series_non_null.max()
            data[f'{col}/median'] = series_non_null.quantile(0.5)
            data[f'{col}/min'] = series_non_null.min()
            data[f'{col}/sum'] = series_non_null.sum()
        elif column_type == DATETIME:
            dates = pd.to_datetime(series_non_null, utc=True, errors='coerce').dropna()
            data[f'{col}/max'] = dates.max().isoformat()
            data[f'{col}/median'] = dates.sort_values().iloc[math.floor(len(dates) / 2)].isoformat()
            data[f'{col}/min'] = dates.min().isoformat()

        if column_type not in NUMBER_TYPES:
            if dates is not None:
                value_counts = dates.value_counts()
            else:
                value_counts = series_non_null.value_counts()

            mode = value_counts.index[0]
            if column_type == DATETIME:
                mode = mode.isoformat()

            data[f'{col}/mode'] = mode

        return data
