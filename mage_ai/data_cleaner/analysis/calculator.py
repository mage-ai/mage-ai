from mage_ai.data_cleaner.analysis import charts
from mage_ai.data_cleaner.analysis.constants import (
    DATA_KEY_CHARTS,
    DATA_KEY_CORRELATION,
    DATA_KEY_TIME_SERIES,
)
from mage_ai.data_cleaner.shared.logger import timer
from mage_ai.data_cleaner.shared.utils import clean_dataframe
from mage_ai.data_cleaner.shared.hash import merge_dict
from mage_ai.data_cleaner.shared.multi import run_parallel
from mage_ai.data_cleaner.column_type_detector import (
    CATEGORY,
    CATEGORY_HIGH_CARDINALITY,
    DATETIME,
    NUMBER,
    NUMBER_WITH_DECIMALS,
    TRUE_OR_FALSE,
)
from pandas.api.types import is_numeric_dtype

DD_KEY = 'lambda.analysis_calculator'


def increment(metric, tags={}):
    pass


class AnalysisCalculator():
    def __init__(
        self,
        df,
        column_types,
        **kwargs,
    ):
        self.df = df
        self.column_types = column_types
        self.features = [{'uuid': col, 'column_type': column_types.get(col)} for col in df.columns]

    def process(self, df, is_clean=False):
        increment(f'{DD_KEY}.process.start', self.tags)

        df_columns = df.columns
        features_to_use = self.features
        datetime_features_to_use = [f for f in self.datetime_features if f['uuid'] in df_columns]

        if not is_clean:
            df_clean = clean_dataframe(df, self.column_types, dropna=False)
        else:
            df_clean = df

        arr_args_1 = [df_clean for _ in features_to_use],
        arr_args_2 = features_to_use,

        data_for_columns = \
            [d for d in run_parallel(self.calculate_column, arr_args_1, arr_args_2)]

        overview = charts.build_overview_data(
            df,
            datetime_features_to_use,
        )

        correlation_overview = []
        for d in data_for_columns:
            corr = d.get(DATA_KEY_CORRELATION)
            if corr:
                correlation_overview.append({
                    'feature': d['feature'],
                    DATA_KEY_CORRELATION: corr,
                })

        increment(f'{DD_KEY}.process.succeeded', self.tags)

        return data_for_columns, merge_dict(overview, {
            DATA_KEY_CORRELATION: correlation_overview,
        })

    @property
    def features_by_uuid(self):
        data = {}
        for feature in self.features:
            data[feature['uuid']] = feature

        return data

    @property
    def datetime_features(self):
        return [f for f in self.features if f['column_type'] == DATETIME]

    @property
    def tags(self):
        return dict()

    def calculate_column(self, df, feature):
        with timer('analysis.calculate_column', dict(feature=feature), verbose=False):
            return self.calculate_column_internal(df, feature)

    def calculate_column_internal(self, df, feature):
        df_columns = df.columns
        features_to_use = [f for f in self.features if f['uuid'] in df_columns]
        datetime_features_to_use = [f for f in self.datetime_features if f['uuid'] in df_columns]

        col = feature['uuid']
        column_type = feature['column_type']

        tags = merge_dict(self.tags, dict(column_type=column_type, feature_uuid=col))
        increment(f'{DD_KEY}.calculate_column.start', tags)

        # series = df[col]
        # series_cleaned = clean_series(series, column_type)
        series_cleaned = df[col].dropna()

        chart_data = []
        correlation = []
        time_series = []

        if column_type in [NUMBER, NUMBER_WITH_DECIMALS] or is_numeric_dtype(df[col]):
            with timer(
                'analysis.calculate_column.build_histogram_data',
                dict(feature=feature),
                verbose=False,
            ):
                histogram_data = charts.build_histogram_data(col, series_cleaned, column_type)
                if histogram_data:
                    chart_data.append(histogram_data)
            with timer(
                'analysis.calculate_column.build_correlation_data',
                dict(feature=feature),
                verbose=False,
            ):
                correlation.append(charts.build_correlation_data(df, col, features_to_use))

        if column_type in [
            CATEGORY,
            CATEGORY_HIGH_CARDINALITY,
            NUMBER,
            NUMBER_WITH_DECIMALS,
            TRUE_OR_FALSE,
        ]:
            time_series = []
            for f in datetime_features_to_use:
                with timer(
                    'analysis.calculate_column.build_time_series_data',
                    dict(feature=feature, datetime_feature=f),
                    verbose=False,
                ):
                    time_series_chart = charts.build_time_series_data(df, feature, f['uuid'], column_type)
                if time_series_chart:
                    time_series.append(time_series_chart)

        increment(f'{DD_KEY}.calculate_column.succeeded', tags)

        return {
            'feature': feature,
            DATA_KEY_CHARTS: chart_data,
            DATA_KEY_CORRELATION: correlation,
            DATA_KEY_TIME_SERIES: time_series,
        }
