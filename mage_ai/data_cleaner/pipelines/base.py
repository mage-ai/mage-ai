from mage_ai.data_cleaner.cleaning_rules.base import STATUS_COMPLETED
from mage_ai.data_cleaner.cleaning_rules.clean_column_names import CleanColumnNames
from mage_ai.data_cleaner.cleaning_rules.impute_values import ImputeValues
from mage_ai.data_cleaner.cleaning_rules.reformat_values import ReformatValues
from mage_ai.data_cleaner.cleaning_rules.remove_collinear_columns import RemoveCollinearColumns
from mage_ai.data_cleaner.cleaning_rules.remove_columns_with_high_empty_rate import (
    RemoveColumnsWithHighEmptyRate,
)
from mage_ai.data_cleaner.cleaning_rules.remove_columns_with_single_value import (
    RemoveColumnsWithSingleValue,
)
from mage_ai.data_cleaner.cleaning_rules.remove_duplicate_rows import RemoveDuplicateRows
from mage_ai.data_cleaner.cleaning_rules.remove_outliers import (
    RemoveOutliers,
    REMOVE_OUTLIERS_TITLE,
)
from mage_ai.data_cleaner.column_type_detector import infer_column_types
from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.shared.array import flatten
from mage_ai.data_cleaner.shared.logger import timer
from mage_ai.data_cleaner.statistics.calculator import StatisticsCalculator

DEFAULT_RULES = [
    CleanColumnNames,
    RemoveColumnsWithHighEmptyRate,
    RemoveColumnsWithSingleValue,
    ReformatValues,
    ImputeValues,
    RemoveCollinearColumns,
    RemoveDuplicateRows,
    RemoveOutliers,
]


class BasePipeline:
    def __init__(self, actions=[]):
        self.actions = actions
        self.rules = DEFAULT_RULES

    def create_actions(self, df, column_types, statistics):
        if not statistics or len(statistics) == 0:
            calculator = StatisticsCalculator(column_types)
            statistics = calculator.calculate_statistics_overview(df, False)
        self.column_types = column_types
        all_suggestions = []
        for rule in self.rules:
            with timer('pipeline.evaluate_cleaning_rule', dict(rule=rule.__name__), verbose=False):
                suggestions = rule(df, column_types, statistics).evaluate()
            if suggestions:
                all_suggestions += suggestions
        self.actions = all_suggestions
        return all_suggestions

    def transform(self, df, auto=True):
        if len(self.actions) == 0:
            print('Pipeline is empty.')
            return df
        action_queue = self.actions
        completed_queue = []
        df_transformed = df
        while len(action_queue) != 0:
            action = action_queue.pop(0)
            df_transformed = BaseAction(action['action_payload']).execute(df_transformed)
            action['status'] = STATUS_COMPLETED
            completed_queue.append(action)
            if auto:
                action_queue = self.update_suggestions(df_transformed)
        self.actions = completed_queue
        return df_transformed

    def update_suggestions(self, df_transformed):
        new_column_types = infer_column_types(df_transformed)
        return self.create_actions(df_transformed, new_column_types, {})

    @classmethod
    def deduplicate_suggestions(self, actions, suggestions, statistics):
        """
        Not show duplicate outlier removal suggestions due to column value distribution changes.
        TODO: Figure out a better way to detect outliers.
        """
        columns_with_outlier_removed = \
            set(flatten([a['action_payload']['action_arguments']
                         for a in actions if a['title'] == REMOVE_OUTLIERS_TITLE]))
        suggestions_filtered = \
            [s for s in suggestions
             if s['title'] != REMOVE_OUTLIERS_TITLE
             or s['action_payload']['action_arguments'][0] not in columns_with_outlier_removed]
        statistics_updated = statistics.copy()
        for col in columns_with_outlier_removed:
            if f'{col}/outlier_count' in statistics_updated:
                statistics_updated[f'{col}/outlier_count'] = 0
                statistics_updated[f'{col}/outliers'] = []
        return suggestions_filtered, statistics_updated
