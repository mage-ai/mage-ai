from mage_ai.data_cleaner.analysis.calculator import AnalysisCalculator
from mage_ai.data_cleaner.column_types import column_type_detector
from mage_ai.data_cleaner.pipelines.base import DEFAULT_RULES, BasePipeline
from mage_ai.data_cleaner.shared.utils import clean_dataframe
from mage_ai.data_cleaner.statistics.calculator import StatisticsCalculator
from mage_ai.shared.hash import merge_dict
from mage_ai.shared.logger import timer, VerboseFunctionExec


def analyze(df):
    cleaner = DataCleaner()
    return cleaner.analyze(df)


def clean(
    df,
    column_types={},
    df_original=None,
    transform=True,
    rules=DEFAULT_RULES,
    rule_configs={},
    verbose=True,
):
    cleaner = DataCleaner(verbose=verbose)
    return cleaner.clean(
        df,
        column_types=column_types,
        df_original=df_original,
        rules=rules,
        rule_configs=rule_configs,
        transform=transform,
    )


class DataCleaner:
    def __init__(self, verbose=False):
        self.verbose = verbose

    def analyze(self, df, column_types={}, df_original=None):
        """Analyze a dataframe
        1. Detect column types
        2. Calculate statisitics
        3. Calculate analysis
        """
        with timer('data_cleaner.infer_column_types'):
            with VerboseFunctionExec('Inferring variable type from dataset', verbose=self.verbose):
                column_types = column_type_detector.infer_column_types(
                    df, column_types=column_types
                )
        with timer('data_cleaner.clean_series'):
            with VerboseFunctionExec(
                'Converting entries to correct datatype',
                verbose=self.verbose,
            ):
                df = clean_dataframe(df, column_types, dropna=False)
        with timer('data_cleaner.calculate_statistics'):
            statistics = StatisticsCalculator(column_types, verbose=self.verbose).process(
                df, df_original=df_original, is_clean=True
            )
        with timer('data_cleaner.calculate_insights'):
            analysis = AnalysisCalculator(
                df, column_types, statistics, verbose=self.verbose
            ).process(df, is_clean=True)
        return dict(
            cleaned_df=df,
            insights=analysis,
            column_types=column_types,
            statistics=statistics,
        )

    def clean(
        self,
        df,
        column_types={},
        df_original=None,
        transform=True,
        rules=DEFAULT_RULES,
        rule_configs={},
    ):
        df_stats = self.analyze(df, column_types=column_types, df_original=df_original)
        df = df_stats['cleaned_df']
        pipeline = BasePipeline(rules=rules, verbose=self.verbose)
        if df_stats['statistics']['is_timeseries']:
            df = df.sort_values(by=df_stats['statistics']['timeseries_index'], axis=0)
        # TODO: Pass in both cleaned and uncleaned versions of dataset
        with timer('data_cleaner.create_suggested_actions'):
            suggested_actions = pipeline.create_actions(
                df,
                df_stats['column_types'],
                df_stats['statistics'],
                rule_configs=rule_configs,
            )
        with timer('data_cleaner.create_preview_results'):
            pipeline.create_preview_results(df, suggested_actions)
        if transform:
            with timer('data_cleaner.transform_data'):
                df_transformed = pipeline.transform(df, auto=True)
        else:
            df_transformed = df
        return merge_dict(
            df_stats,
            dict(
                df=df_transformed,
                suggestions=suggested_actions,
                pipeline=pipeline,
            ),
        )
