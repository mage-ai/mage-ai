from mage_ai.data_cleaner.analysis import charts
from mage_ai.data_cleaner.analysis.constants import (
    DATA_KEY_CHARTS,
    DATA_KEY_CORRELATION,
    DATA_KEY_TIME_SERIES,
)
from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.data_cleaner.shared.utils import clean_dataframe, is_numeric_dtype
from mage_ai.shared.logger import timer, VerboseFunctionExec
from mage_ai.shared.hash import merge_dict
import logging

DD_KEY = 'lambda.analysis_calculator'
TIMESERIES_COLUMN_TYPES = frozenset(
    [
        ColumnType.CATEGORY,
        ColumnType.CATEGORY_HIGH_CARDINALITY,
        ColumnType.NUMBER,
        ColumnType.NUMBER_WITH_DECIMALS,
        ColumnType.TRUE_OR_FALSE,
    ]
)
VERBOSE = False

logger = logging.getLogger(__name__)


def increment(metric, tags={}):
    pass


class AnalysisCalculator:
    def __init__(
        self,
        df,
        column_types,
        statistics,
        verbose=False,
        **kwargs,
    ):
        self.df = df
        self.column_types = column_types
        self.features = [{'uuid': col, 'column_type': column_types.get(col)} for col in df.columns]
        self.verbose = verbose

    def process(self, df, is_clean=False):
        with VerboseFunctionExec('Generating visualizations', verbose=self.verbose):
            return self.__process(df, is_clean=is_clean)

    def __process(self, df, is_clean=False):
        increment(f'{DD_KEY}.process.start', self.tags)
        df_columns = df.columns

        features_to_use = self.features
        datetime_features_to_use = [f for f in self.datetime_features if f['uuid'] in df_columns]
        numeric_features_to_use = self.numeric_features

        if not is_clean:
            df_clean = clean_dataframe(df, self.column_types, dropna=False)
        else:
            df_clean = df

        arr_args_1 = ([df_clean for _ in features_to_use],)
        arr_args_2 = (features_to_use,)

        data_for_columns = [d for d in map(self.calculate_column, *arr_args_1, *arr_args_2)]

        correlation_data = self.calculate_correlation_data(df)
        time_series_charts = self.calculate_timeseries_data(df)
        for d in data_for_columns:
            fuuid = d['feature']['uuid']
            if fuuid in correlation_data:
                d[DATA_KEY_CORRELATION] = correlation_data[fuuid]
            if fuuid in time_series_charts:
                d[DATA_KEY_TIME_SERIES] = time_series_charts[fuuid]

        overview = charts.build_overview_data(
            df,
            datetime_features_to_use,
            numeric_features_to_use,
        )

        correlation_overview = []
        for d in data_for_columns:
            corr = d.get(DATA_KEY_CORRELATION)
            if corr:
                correlation_overview.append(
                    {
                        'feature': d['feature'],
                        DATA_KEY_CORRELATION: corr,
                    }
                )

        increment(f'{DD_KEY}.process.succeeded', self.tags)

        return data_for_columns, merge_dict(
            overview,
            {
                DATA_KEY_CORRELATION: correlation_overview,
            },
        )

    @property
    def features_by_uuid(self):
        data = {}
        for feature in self.features:
            data[feature['uuid']] = feature

        return data

    @property
    def datetime_features(self):
        return [f for f in self.features if f['column_type'] == ColumnType.DATETIME]

    @property
    def numeric_features(self):
        return [
            f['uuid']
            for f in self.features
            if is_numeric_dtype(self.df, f['uuid'], f['column_type'])
        ]

    @property
    def tags(self):
        return dict()

    def calculate_column(self, df, feature):
        with timer('analysis.calculate_column', dict(feature=feature), verbose=VERBOSE):
            try:
                return self.calculate_column_internal(df, feature)
            except Exception:
                logger.exception(f'Failed to calculate stats for column {feature}')
                return {
                    'feature': feature,
                    DATA_KEY_CHARTS: [],
                    DATA_KEY_CORRELATION: [],
                    DATA_KEY_TIME_SERIES: [],
                }

    def calculate_column_internal(self, df, feature):
        col = feature['uuid']
        column_type = feature['column_type']

        chart_data = []
        correlation = []

        is_numeric_col = is_numeric_dtype(df, col, column_type)
        if is_numeric_col:
            with timer(
                'analysis.calculate_column.build_histogram_data',
                dict(feature=feature),
                verbose=VERBOSE,
            ):
                series_cleaned = df[col].dropna()
                histogram_data = charts.build_histogram_data(col, series_cleaned, column_type)
                if histogram_data:
                    chart_data.append(histogram_data)

        return {
            'feature': feature,
            DATA_KEY_CHARTS: chart_data,
            DATA_KEY_CORRELATION: correlation,
        }

    def calculate_correlation_data(self, df):
        return charts.build_correlation_data(df)

    def calculate_timeseries_data(self, df):
        timeseries_features = [
            f for f in self.features if f['column_type'] in TIMESERIES_COLUMN_TYPES
        ]
        datetime_features_to_use = self.datetime_features

        charts_by_column = dict()
        for f in datetime_features_to_use:
            time_series_charts = charts.build_time_series_data(df, timeseries_features, f['uuid'])
            if time_series_charts is None:
                continue
            for f, chart in time_series_charts.items():
                if f not in charts_by_column:
                    charts_by_column[f] = [chart]
                else:
                    charts_by_column[f].append(chart)
        return charts_by_column
