from data_cleaner import column_type_detector
from data_cleaner.analysis.calculator import AnalysisCalculator
from data_cleaner.pipelines.base import BasePipeline
from data_cleaner.statistics.calculator import StatisticsCalculator


def clean(df):
    cleaner = DataCleaner()
    return cleaner.clean(df)


class DataCleaner():
    def __init__(self):
        pass

    """
    1. Detect column types
    2. Calculate statisitics
    3. Calculate analysis
    4. Apply cleaning rules
    """
    def clean(self, df):
        column_types = column_type_detector.infer_column_types(df)
        statistics = StatisticsCalculator(column_types).process(df)
        analysis = AnalysisCalculator(df, column_types).process(df)
        suggested_actions = BasePipeline().create_actions(df, column_types, statistics)
        return dict(
            column_types=column_types,
            statistics=statistics,
            analysis=analysis,
            suggested_actions=suggested_actions,
        )
