from mage_ai.data_cleaner.shared.hash import merge_dict
from mage_ai.data_cleaner.shared.logger import timer
from mage_ai.data_cleaner.shared.utils import clean_dataframe
from mage_ai.data_cleaner.column_type_detector import (
    DATETIME,
    NUMBER_TYPES,
    get_mismatched_rows,
)
import math
import numpy as np
import pandas as pd
import traceback

INVALID_VALUE_SAMPLE_COUNT = 100
OUTLIER_SAMPLE_COUNT = 100
OUTLIER_ZSCORE_THRESHOLD = 3
VALUE_COUNT_LIMIT = 20


def increment(metric, tags):
    pass


class StatisticsCalculator:
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

    def process(self, df, is_clean=True):
        return self.calculate_statistics_overview(df, is_clean)

    def calculate_statistics_overview(self, df, is_clean=True):
        increment(
            'statistics.calculate_statistics_overview.start',
            self.data_tags,
        )

        with timer('statistics.calculate_statistics_overview.time', self.data_tags, verbose=False):
            if not is_clean:
                df = clean_dataframe(df, self.column_types, dropna=False)
            data = dict(count=len(df.index))

            arr_args_1 = ([df[col] for col in df.columns],)
            arr_args_2 = ([col for col in df.columns],)

            dicts = map(self.statistics_overview, *arr_args_1, *arr_args_2)

            for d in dicts:
                data.update(d)

            # Aggregated stats
            column_count = len(df.columns)
            data['total_null_value_count'] = sum(
                data[f'{col}/null_value_count'] for col in df.columns
            )
            data['total_invalid_value_count'] = sum(
                data[f'{col}/invalid_value_count'] for col in df.columns
            )
            data['avg_null_value_count'] = data['total_null_value_count'] / column_count
            data['avg_invalid_value_count'] = data['total_invalid_value_count'] / column_count
            data['completeness'] = (
                1 - data['avg_null_value_count'] / data['count'] if data['count'] > 0 else 0
            )
            data['validity'] = (
                data['completeness'] - data['avg_invalid_value_count'] / data['count']
                if data['count'] > 0
                else 0
            )
            df_dedupe = df.drop_duplicates()
            data['duplicate_row_count'] = df.shape[0] - df_dedupe.shape[0]
            data['empty_column_count'] = len(
                [col for col in df.columns if data[f'{col}/count'] == 0]
            )

            timeseries_metadata = self.__evaluate_timeseries(data)
            data.update(timeseries_metadata)

            # object_key = s3_paths.path_statistics_overview(self.object_key_prefix)
            # s3_data.upload_json_sorted(self.s3_client, object_key, data)

        increment(
            'statistics.calculate_statistics_overview.success',
            self.data_tags,
        )

        return data

    def null_seq_gen(self, arr):
        prev = -1
        for is_null in arr:
            if is_null:
                prev += 1
            else:
                prev = 0
            yield prev

    def statistics_overview(self, series, col):
        try:
            return self.__statistics_overview(series, col)
        except Exception as err:
            increment(
                'statistics.calculate_statistics_overview.column.failed',
                merge_dict(
                    self.data_tags,
                    {
                        'col': col,
                        'error': err.__class__.__name__,
                    },
                ),
            )
            traceback.print_exc()
            return {}

    def __evaluate_timeseries(self, data):
        indices = []
        for column, dtype in self.column_types.items():
            if data[f'{column}/null_value_rate'] <= 0.1 and dtype == DATETIME:
                indices.append(column)
        return {'is_timeseries': len(indices) != 0, 'timeseries_index': indices}

    def __statistics_overview(self, series, col):
        # The following regex based replace has high overheads
        # series = series.replace(r'^\s*$', np.nan, regex=True)
        df_value_counts = series.value_counts(dropna=False)

        df_top_value_counts = df_value_counts.copy()
        if df_top_value_counts.shape[0] > VALUE_COUNT_LIMIT:
            df_top_value_counts = df_top_value_counts.head(VALUE_COUNT_LIMIT)

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
        series_non_null = series.dropna()

        # Fix json serialization issue
        df_top_value_counts.index = df_top_value_counts.index.astype(str)

        count_unique = len(df_value_counts.index)

        data = {
            f'{col}/count': series_non_null.size,
            f'{col}/count_distinct': count_unique - 1
            if np.nan in df_value_counts
            else count_unique,
            f'{col}/null_value_rate': 0
            if series.size == 0
            else series.isnull().sum() / series.size,
            f'{col}/null_value_count': series.isnull().sum(),
            f'{col}/value_counts': df_top_value_counts.to_dict(),
        }

        data[f'{col}/max_null_seq'] = (
            max(self.null_seq_gen(series.isna().to_numpy()))
            if data[f'{col}/count'] != 0
            else len(series)
        )

        dates = None
        if len(series_non_null) > 0:
            if column_type in NUMBER_TYPES:
                data[f'{col}/average'] = series_non_null.mean()
                data[f'{col}/max'] = series_non_null.max()
                data[f'{col}/median'] = series_non_null.median()
                data[f'{col}/min'] = series_non_null.min()
                data[f'{col}/sum'] = series_non_null.sum()
                data[f'{col}/skew'] = series_non_null.skew()
                data[f'{col}/std'] = series_non_null.std()

                # detect outliers
                if data[f'{col}/std'] == 0:
                    data[f'{col}/outlier_count'] = 0
                else:
                    series_z_score = (
                        (series_non_null - data[f'{col}/average']) / data[f'{col}/std']
                    ).abs()
                    series_outliers = series_z_score[series_z_score >= OUTLIER_ZSCORE_THRESHOLD]
                    data[f'{col}/outlier_count'] = series_outliers.count()
                    data[f'{col}/outliers'] = (
                        series_non_null.loc[series_outliers.index]
                        .iloc[:OUTLIER_SAMPLE_COUNT]
                        .tolist()
                    )
            elif column_type == DATETIME:
                dates = pd.to_datetime(series_non_null, utc=True, errors='coerce').dropna()
                data[f'{col}/max'] = dates.max().isoformat()
                data[f'{col}/median'] = (
                    dates.sort_values().iloc[math.floor(len(dates) / 2)].isoformat()
                )
                data[f'{col}/min'] = dates.min().isoformat()

        if column_type not in NUMBER_TYPES:
            if dates is not None:
                df_value_counts = dates.value_counts()
                string_df_value_counts = df_value_counts.head(VALUE_COUNT_LIMIT)
                string_df_value_counts.index = string_df_value_counts.index.astype(str)
                data[f'{col}/value_counts'] = string_df_value_counts.to_dict()

            mode, mode_idx = None, 0
            while mode_idx < count_unique and pd.isna(df_value_counts.index[mode_idx]):
                mode_idx += 1
            if mode_idx < count_unique:
                mode = df_value_counts.index[mode_idx]

            if column_type == DATETIME and mode is not None:
                data[f'{col}/mode'] = mode.isoformat()
            else:
                data[f'{col}/mode'] = mode

            data[f'{col}/mode_ratio'] = (
                df_value_counts[mode].item() / df_value_counts.sum() if mode else 0
            )

        # Detect mismatched formats for some column types
        invalid_rows = get_mismatched_rows(series_non_null, column_type)
        data[f'{col}/invalid_value_count'] = len(invalid_rows)
        data[f'{col}/invalid_values'] = invalid_rows[:INVALID_VALUE_SAMPLE_COUNT]
        data[f'{col}/invalid_value_rate'] = (
            0 if series.size == 0 else data[f'{col}/invalid_value_count'] / series.size
        )

        # Calculate quality metrics
        data[f'{col}/completeness'] = 1 - data[f'{col}/null_value_rate']
        data[f'{col}/validity'] = data[f'{col}/completeness'] - data[f'{col}/invalid_value_rate']
        data[f'{col}/quality'] = 'Good' if data[f'{col}/validity'] >= 0.8 else 'Bad'

        return data
