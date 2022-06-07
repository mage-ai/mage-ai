from mage_ai.data_cleaner import column_type_detector
from mage_ai.data_cleaner.analysis.calculator import AnalysisCalculator
from mage_ai.data_cleaner.pipelines.base import BasePipeline
from mage_ai.data_cleaner.shared.hash import merge_dict
from mage_ai.data_cleaner.shared.logger import timer
from mage_ai.data_cleaner.shared.utils import clean_dataframe
from mage_ai.data_cleaner.statistics.calculator import StatisticsCalculator


def analyze(df):
    cleaner = DataCleaner()
    return cleaner.analyze(df)


def clean(df, transform=True):
    cleaner = DataCleaner()
    return cleaner.clean(df, transform=transform)


class DataCleaner():
    def analyze(self, df):
        """ Analyze a dataframe
        1. Detect column types
        2. Calculate statisitics
        3. Calculate analysis
        """
        with timer('data_cleaner.infer_column_types'):
            column_types = column_type_detector.infer_column_types(df)
        with timer('data_cleaner.clean_series'):
            df = clean_dataframe(df, column_types, dropna=False)
        with timer('data_cleaner.calculate_statistics'):
            statistics = StatisticsCalculator(column_types).process(df, is_clean=True)
        with timer('data_cleaner.calculate_insights'):
            analysis = AnalysisCalculator(df, column_types, statistics).process(df, is_clean=True)
        return dict(
            insights=analysis,
            column_types=column_types,
            statistics=statistics,
        )

    def clean(self, df, transform=True):
        df_stats = self.analyze(df)
        df = clean_dataframe(df, df_stats['column_types'])
        pipeline = BasePipeline()
        if df_stats['statistics']['is_timeseries']:
            df = df.sort_values(by=df_stats['statistics']['timeseries_index'], axis=0)
        # TODO: Pass in both cleaned and uncleaned versions of dataset
        with timer('data_cleaner.create_suggested_actions'):
            suggested_actions = pipeline.create_actions(
                df,
                df_stats['column_types'],
                df_stats['statistics'],
            )
        if transform:
            with timer('data_cleaner.transform_data'):
                df_transformed = pipeline.transform(df, auto=True)
        else:
            df_transformed = df
        return merge_dict(df_stats, dict(
            df=df_transformed,
            suggestions=suggested_actions,
            pipeline=pipeline,
        ))
