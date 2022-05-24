from data_cleaner.cleaning_rules.remove_columns_with_high_empty_rate \
    import RemoveColumnsWithHighEmptyRate
from data_cleaner.cleaning_rules.remove_columns_with_single_value \
    import RemoveColumnsWithSingleValue
from data_cleaner.cleaning_rules.remove_duplicate_rows \
    import RemoveDuplicateRows
from data_cleaner.transformer_actions.base import BaseAction

DEFAULT_RULES = [
    RemoveColumnsWithHighEmptyRate,
    RemoveColumnsWithSingleValue,
    RemoveDuplicateRows,
]


class BasePipeline():
    def __init__(self, actions=[]):
        self.actions = actions
        self.rules = DEFAULT_RULES

    def create_actions(self, df, column_types, statistics):
        all_suggestions = []
        for rule in self.rules:
            suggestions = rule(df, column_types, statistics).evaluate()
            if suggestions:
                all_suggestions += suggestions
        self.actions = all_suggestions
        return all_suggestions

    def transform(self, df):
        if len(self.actions) == 0:
            print('Pipeline is empty.')
            return df
        df_transformed = df
        for action in self.actions:
            df_transformed = BaseAction(action['action_payload']).execute(df_transformed)
        return df_transformed
