from collections import deque
from mage_ai.data_cleaner.cleaning_rules.base import STATUS_COMPLETED
from mage_ai.data_cleaner.cleaning_rules.clean_column_names import CleanColumnNames
from mage_ai.data_cleaner.cleaning_rules.impute_values import ImputeValues
from mage_ai.data_cleaner.cleaning_rules.reformat_values import ReformatValues
from mage_ai.data_cleaner.cleaning_rules.remove_collinear_columns \
    import RemoveCollinearColumns
from mage_ai.data_cleaner.cleaning_rules.remove_columns_with_high_empty_rate \
    import RemoveColumnsWithHighEmptyRate
from mage_ai.data_cleaner.cleaning_rules.remove_columns_with_single_value \
    import RemoveColumnsWithSingleValue
from mage_ai.data_cleaner.cleaning_rules.remove_duplicate_rows \
    import RemoveDuplicateRows
from mage_ai.data_cleaner.cleaning_rules.remove_outliers \
    import RemoveOutliers
from mage_ai.data_cleaner.column_type_detector import infer_column_types
from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.statistics.calculator import StatisticsCalculator

DEFAULT_RULES = [
    CleanColumnNames,
    ReformatValues,
    ImputeValues,
    RemoveCollinearColumns,
    RemoveColumnsWithHighEmptyRate,
    RemoveColumnsWithSingleValue,
    RemoveDuplicateRows,
    RemoveOutliers,
]


class BasePipeline():

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
            suggestions = rule(df, column_types, statistics).evaluate()
            if suggestions:
                all_suggestions += suggestions
        self.actions = all_suggestions
        return all_suggestions

    def transform(self, df, auto=True):
        if len(self.actions) == 0:
            print('Pipeline is empty.')
            return df
        action_queue = deque(self.actions)
        completed_queue = []
        df_transformed = df
        while len(action_queue) != 0:
            action = action_queue.popleft()
            df_transformed = BaseAction(action['action_payload']).execute(df_transformed)
            action['status'] = STATUS_COMPLETED
            completed_queue.append(action)
            if auto:
                action_queue = deque(self.update_suggestions(df_transformed))
        self.actions = completed_queue
        return df_transformed

    def update_suggestions(self, df_transformed):
        new_column_types = infer_column_types(df_transformed)
        return self.create_actions(df_transformed, new_column_types, {})
