from data_cleaner.cleaning_rules.base import STATUS_COMPLETED
from data_cleaner.cleaning_rules.clean_column_names import CleanColumnNames
from data_cleaner.cleaning_rules.impute_values import ImputeValues
from data_cleaner.cleaning_rules.reformat_values import ReformatValues
from data_cleaner.cleaning_rules.remove_collinear_columns \
    import RemoveCollinearColumns
from data_cleaner.cleaning_rules.remove_columns_with_high_empty_rate \
    import RemoveColumnsWithHighEmptyRate
from data_cleaner.cleaning_rules.remove_columns_with_single_value \
    import RemoveColumnsWithSingleValue
from data_cleaner.cleaning_rules.remove_duplicate_rows \
    import RemoveDuplicateRows
from data_cleaner.transformer_actions.base import BaseAction
from data_cleaner.transformer_actions.constants import ActionType

DEFAULT_RULES = [
    CleanColumnNames,
    ReformatValues,
    ImputeValues,
    RemoveCollinearColumns,
    RemoveColumnsWithHighEmptyRate,
    RemoveColumnsWithSingleValue,
    RemoveDuplicateRows
]


class BasePipeline():
    def __init__(self, actions=[]):
        self.actions = actions
        self.rules = DEFAULT_RULES

    def create_actions(self, df, column_types, statistics):
        self.column_types = column_types
        self.statistics = statistics
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
        if self.actions[0]['action_payload']['action_type'] == ActionType.CLEAN_COLUMN_NAME:
            action = self.actions[0]
            df_transformed = BaseAction(action['action_payload']).execute(df)
            action['status'] = STATUS_COMPLETED
            new_column_types = {}
            new_statistics = {}
            new_statistics['timeseries_index'] = []
            for old_key, new_key in zip(df.columns, df_transformed.columns):
                new_column_types[new_key] = self.column_types[old_key]
                search_term = old_key + '/'
                for key in filter(lambda x: x.startswith(search_term), self.statistics):
                    new_statistics[key.replace(old_key, new_key)] = self.statistics[key]
                if old_key in self.statistics['timeseries_index']:
                    new_statistics['timeseries_index'].append(new_key)
            new_statistics['is_timeseries'] = self.statistics['is_timeseries']
            new_statistics['count'] = self.statistics['count']
            self.actions = self.create_actions(df_transformed, new_column_types, new_statistics)
            self.statistics = new_statistics
            self.column_types = new_column_types
        for action in self.actions:
            df_transformed = BaseAction(action['action_payload']).execute(df_transformed)
            action['status'] = STATUS_COMPLETED
        return df_transformed
