from mage_ai.data_cleaner.column_types.column_type_detector import find_syntax_errors
from mage_ai.data_cleaner.column_types.constants import NUMBER_TYPES, ColumnType
from mage_ai.data_cleaner.shared.utils import clean_dataframe
from mage_ai.shared.constants import SAMPLE_SIZE
from mage_ai.shared.custom_types import FrozenDict
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.logger import timer, VerboseFunctionExec
import math
import numpy as np
import pandas as pd
import logging


EMAIL_DOMAIN_REGEX = r'\@([^\s]*)'
INVALID_VALUE_SAMPLE_COUNT = 100
OUTLIER_SAMPLE_COUNT = 100
OUTLIER_ZSCORE_THRESHOLD = 3
PUNCTUATION = r'[:;\.,\/\\&`"\'\(\)\[\]\{\}]'
STOP_WORD_LIST = frozenset(['is', 'and', 'yet', 'but', 'a', 'or', 'nor', 'not', 'to', 'the'])
VALUE_COUNT_LIMIT = 20

logger = logging.getLogger(__name__)


def increment(metric, tags):
    pass


class StatisticsCalculator:
    """
    Key Assumption: statistics are clean - all values of the correct exact type at this point
    """

    def __init__(
        self,
        # s3_client,
        # object_key_prefix,
        # feature_set_version,
        column_types,
        verbose=False,
        **kwargs,
    ):
        self.column_types = column_types
        self.verbose = verbose

    @property
    def data_tags(self):
        return dict()

    def process(self, df, df_original=None, is_clean=True):
        return self.calculate_statistics_overview(df, df_original=df_original, is_clean=is_clean)

    def calculate_statistics_overview(self, df, df_original=None, is_clean=True):
        increment(
            'statistics.calculate_statistics_overview.start',
            self.data_tags,
        )
        with VerboseFunctionExec('Calculating statistics per variable', verbose=self.verbose):
            return self.__calculate_statistics_overview(
                df,
                df_original=df_original,
                is_clean=is_clean,
            )

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
            logger.exception(f'An error was caught while processing statistics: {err}')
            return {}

    def __calculate_statistics_overview(self, df, df_original=None, is_clean=True):
        with timer('statistics.calculate_statistics_overview.time', self.data_tags, verbose=False):
            if not is_clean:
                df = clean_dataframe(df, self.column_types, dropna=False)
            data = dict(
                original_row_count=len((df if df_original is None else df_original).index),
                count=len(df.index)
            )

            arr_args_1 = ([df[col] for col in df.columns],)
            arr_args_2 = ([col for col in df.columns],)

            dicts = map(self.statistics_overview, *arr_args_1, *arr_args_2)

            for d in dicts:
                data.update(d)

            # Aggregated stats
            column_count = len(df.columns)
            row_count = df.shape[0]

            data['total_null_value_count'] = sum(
                data[f'{col}/null_value_count'] for col in df.columns
            )
            data['total_null_value_rate'] = self.__protected_division(
                data['total_null_value_count'], df.size
            )
            data['total_invalid_value_count'] = sum(
                data[f'{col}/invalid_value_count'] for col in df.columns
            )
            data['total_invalid_value_rate'] = self.__protected_division(
                data['total_invalid_value_count'], df.size
            )

            df_dedupe = df.drop_duplicates()
            data['duplicate_row_count'] = row_count - df_dedupe.shape[0]

            data['empty_column_count'] = len(
                [col for col in df.columns if data[f'{col}/count'] == 0]
            )

            data['avg_null_value_count'] = self.__protected_division(
                data['total_null_value_count'], column_count
            )
            data['avg_invalid_value_count'] = self.__protected_division(
                data['total_invalid_value_count'], column_count
            )
            data['empty_column_rate'] = self.__protected_division(
                data['empty_column_count'], column_count
            )
            data['duplicate_row_rate'] = self.__protected_division(
                data['duplicate_row_count'], row_count
            )

            data['completeness'] = 1 - self.__protected_division(
                data['avg_null_value_count'], data['count']
            )
            data['validity'] = data['completeness'] - self.__protected_division(
                data['avg_invalid_value_count'], data['count']
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

    def __evaluate_timeseries(self, data):
        indices = []
        for column, dtype in self.column_types.items():
            if data[f'{column}/null_value_rate'] <= 0.1 and dtype == ColumnType.DATETIME:
                indices.append(column)
        return {'is_timeseries': len(indices) != 0, 'timeseries_index': indices}

    def __protected_division(self, dividend: float, divisor: float) -> float:
        return dividend / divisor if divisor != 0 else 0

    def __statistics_overview(self, series, col):
        # The following regex based replace has high overheads
        # series = series.replace(r'^\s*$', np.nan, regex=True)
        df_value_counts = series.value_counts(dropna=False)

        df_top_value_counts = df_value_counts.copy()
        if df_top_value_counts.shape[0] > VALUE_COUNT_LIMIT:
            df_top_value_counts = df_top_value_counts.head(VALUE_COUNT_LIMIT)

        # TODO: remove duplicate data for distinct values
        # object_key_distinct_values = \
        #     s3_paths.path_distinct_values_by_column(self.object_key_prefix, col)
        # s3_data.upload_dataframe(
        #     self.s3_client, df_top_value_counts, object_key_distinct_values, columns=[col])
        # object_key_statistics = s3_paths.path_statistics_by_column(self.object_key_prefix, col)
        # s3_data.upload_dataframe(self.s3_client, df_top_value_counts, object_key_statistics)

        # features = self.feature_set_version['features']
        # feature = find(lambda x: x['uuid'] == col, features)

        # if feature and feature.get('transformed'):
        #     return {}

        column_type = self.column_types.get(col)
        series_non_null = series.dropna()

        # Fix json serialization issue
        df_top_value_counts.index = pd.Index(str(idx) for idx in df_top_value_counts.index)

        df_value_counts_non_null = df_value_counts[df_value_counts.index.notnull()]
        count_unique = len(df_value_counts_non_null)

        data = {
            f'{col}/count': series_non_null.size,
            f'{col}/count_distinct': count_unique,
            f'{col}/null_value_count': series.isnull().sum(),
            f'{col}/value_counts': df_top_value_counts.to_dict(),
        }

        data[f'{col}/null_value_rate'] = self.__protected_division(
            data[f'{col}/null_value_count'], series.size
        )
        data[f'{col}/unique_value_rate'] = self.__protected_division(
            data[f'{col}/count_distinct'], series.size
        )
        data[f'{col}/max_null_seq'] = (
            max(self.null_seq_gen(series.isna().to_numpy()))
            if data[f'{col}/count'] != 0
            else len(series)
        )

        invalid_rows = find_syntax_errors(series_non_null, column_type)

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
                    data[f'{col}/outlier_ratio'] = self.__protected_division(
                        data[f'{col}/outlier_count'], series.size
                    )
                    data[f'{col}/outliers'] = (
                        series_non_null.loc[series_outliers.index]
                        .iloc[:OUTLIER_SAMPLE_COUNT]
                        .tolist()
                    )
                # generate five number summary
                first_quartile = series_non_null.quantile(0.25, interpolation='nearest')
                third_quartile = series_non_null.quantile(0.75, interpolation='nearest')
                iqr = third_quartile - first_quartile
                outlier_mask = (series_non_null <= first_quartile - 1.5 * iqr) | (
                    series_non_null >= third_quartile + 1.5 * iqr
                )
                outliers = series_non_null[outlier_mask].unique().tolist()
                data[f'{col}/box_plot_data'] = {
                    'outliers': outliers[:OUTLIER_SAMPLE_COUNT],
                    'min': data[f'{col}/min'],
                    'first_quartile': first_quartile,
                    'median': data[f'{col}/median'],
                    'third_quartile': third_quartile,
                    'max': data[f'{col}/max'],
                }
                if len(outliers) != 0:
                    not_outliers = series_non_null[~outlier_mask]
                    data[f'{col}/box_plot_data']['min'] = not_outliers.min()
                    data[f'{col}/box_plot_data']['max'] = not_outliers.max()
            elif column_type == ColumnType.DATETIME:
                dates = pd.to_datetime(series_non_null, utc=True, errors='coerce').dropna()
                data[f'{col}/max'] = dates.max().isoformat()
                data[f'{col}/median'] = (
                    dates.sort_values().iloc[math.floor(len(dates) / 2)].isoformat()
                )
                data[f'{col}/min'] = dates.min().isoformat()
            elif column_type == ColumnType.TEXT:
                text_series = series_non_null
                string_length = text_series.str.len()
                data[f'{col}/avg_string_length'] = string_length.mean()
                data[f'{col}/min_character_count'] = string_length.min()
                data[f'{col}/max_character_count'] = string_length.max()
                text_series = text_series.str.replace(PUNCTUATION, ' ', regex=True)
                text_series = text_series.str.lower().str.strip()
                text_series = text_series.str.split(r'\s+')

                word_count = text_series.map(len)
                data[f'{col}/max_word_count'] = word_count.max()
                data[f'{col}/avg_word_count'] = word_count.mean()
                data[f'{col}/min_word_count'] = word_count.min()

                exploded_text_series = text_series.explode()
                data[f'{col}/word_distribution'] = (
                    exploded_text_series.value_counts().head(VALUE_COUNT_LIMIT).to_dict()
                )
                # TODO: Calculate average word count excluding stopwords
                # data[f'{col}/word_count_excl_stopwords'] = (
                #     len(exploded_text_series) - exploded_text_series.isin(STOP_WORD_LIST).sum()
                # )
            elif column_type == ColumnType.EMAIL:
                valid_emails = series_non_null[~invalid_rows]
                domains = valid_emails.str.extract(EMAIL_DOMAIN_REGEX, expand=False)
                data[f'{col}/domain_distribution'] = (
                    domains.value_counts().head(VALUE_COUNT_LIMIT).to_dict()
                )
            elif column_type == ColumnType.LIST:
                lengths = series_non_null.str.len()
                data[f'{col}/avg_list_length'] = lengths.mean()
                data[f'{col}/max_list_length'] = lengths.max()
                data[f'{col}/min_list_length'] = lengths.min()
                data[f'{col}/length_distribution'] = (
                    lengths.value_counts().head(VALUE_COUNT_LIMIT).to_dict()
                )

                elements = series_non_null.explode()
                element_value_counts = elements.value_counts(dropna=False)
                data[f'{col}/most_frequent_element'] = element_value_counts.index[0]
                data[f'{col}/least_frequent_element'] = element_value_counts.index[-1]
                if any(
                    isinstance(idx, FrozenDict)
                    for idx in element_value_counts.index[:VALUE_COUNT_LIMIT]
                ):
                    str_index = element_value_counts.index.astype(str)
                    element_value_counts.index = str_index
                data[f'{col}/element_distribution'] = element_value_counts.head(
                    VALUE_COUNT_LIMIT
                ).to_dict()

        if column_type not in NUMBER_TYPES:
            if dates is not None:
                df_value_counts = dates.value_counts()
                string_df_value_counts = df_value_counts.head(VALUE_COUNT_LIMIT)
                string_df_value_counts.index = string_df_value_counts.index.astype(str)
                data[f'{col}/value_counts'] = string_df_value_counts.to_dict()

            mode, mode_idx = None, 0
            while mode_idx < count_unique and df_value_counts.index[mode_idx] in [None, np.nan]:
                mode_idx += 1
            if mode_idx < count_unique:
                mode = df_value_counts.index[mode_idx]

            if column_type == ColumnType.DATETIME and mode is not None:
                data[f'{col}/mode'] = mode.isoformat()
            else:
                data[f'{col}/mode'] = mode

            data[f'{col}/mode_ratio'] = (
                df_value_counts[mode].item() / df_value_counts.sum() if mode else 0
            )

        # Detect mismatched formats for some column types
        data[f'{col}/invalid_value_count'] = invalid_rows.sum()
        invalid_values = series_non_null[invalid_rows]
        data[f'{col}/invalid_values'] = invalid_values[:INVALID_VALUE_SAMPLE_COUNT].tolist()
        invalid_indices = series.index.get_indexer(invalid_values.index)
        data[f'{col}/invalid_indices'] = invalid_indices[
            np.where(invalid_indices <= SAMPLE_SIZE)
        ].tolist()
        data[f'{col}/invalid_value_distribution'] = (
            invalid_values.value_counts().head(VALUE_COUNT_LIMIT).to_dict()
        )
        data[f'{col}/invalid_value_rate'] = self.__protected_division(
            data[f'{col}/invalid_value_count'], series.size
        )

        # Calculate quality metrics
        data[f'{col}/completeness'] = 1 - data[f'{col}/null_value_rate']
        data[f'{col}/validity'] = data[f'{col}/completeness'] - data[f'{col}/invalid_value_rate']
        data[f'{col}/quality'] = 'Good' if data[f'{col}/validity'] >= 0.8 else 'Bad'

        return data
