from data_cleaner.cleaning_rules.base import BaseRule
from data_cleaner.column_type_detector import (
    CATEGORICAL_TYPES,
    DATETIME,
    NUMBER_TYPES,
    STRING_TYPES
)
from data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
    ImputationStrategy
)
import numpy as np


class ImputeValues(BaseRule):
    # ub = upper bound, lb = lower bound
    DATA_SM_UB = 100
    MAX_NULL_SEQ_LENGTH = 4
    ROW_KEPT_LB = 0.7
    SKEW_UB = 0.7
    SM_LG_HYPERPARAMS = {
        "small": {
            "avg_med_empty_ub": 0.3,
            "rand_max_unique_count": 10,
            "rand_min_count": 30
        },
        "large": {
            "avg_med_empty_ub": 0.5,
            "rand_empty_ub": 0.3
        }
    }

    def __init__(self, df, column_types, statistics):
        super().__init__(df, column_types, statistics)
        self.strategy_cache = {
            ImputationStrategy.AVG: [],
            ImputationStrategy.MED: [],
            ImputationStrategy.NOOP: [],
            ImputationStrategy.RANDOM: [],
            ImputationStrategy.ROW_RM: [],
            ImputationStrategy.SEQ: []
        }
        self.action_constructor = ImputeActionConstructor(
            self.df, 
            self.column_types, 
            self._build_transformer_action_suggestion
        )

    def build_suggestions(self):
        suggestions = []
        if len(self.strategy_cache[ImputationStrategy.ROW_RM]) != 0:
            strategy_cache_entry = self.strategy_cache[ImputationStrategy.ROW_RM]
            suggestions.append(
                self.action_constructor(ImputationStrategy.ROW_RM, strategy_cache_entry)
            )
        else:
            for strategy in self.strategy_cache:
                strategy_cache_entry = self.strategy_cache[strategy]
                if strategy != ImputationStrategy.NOOP and len(strategy_cache_entry) != 0:
                    suggestions.append(
                        self.action_constructor(strategy, strategy_cache_entry)
                    )
        return suggestions

    def evaluate(self):
        if not self.df.empty:
            self.cleaned_df = self.df.applymap(lambda x: x if (not isinstance(x, str) or
                                (len(x) > 0 and not x.isspace())) else np.nan)
            null_mask = self.__get_null_mask()
            ratio_rows_kept = len(self.df[~null_mask]) / len(self.df)
            if ratio_rows_kept == 1:
                self.strategy_cache[ImputationStrategy.NOOP].extend(self.df_columns)
            elif ratio_rows_kept >= self.ROW_KEPT_LB:
                indices = self.df[null_mask].index
                self.strategy_cache[ImputationStrategy.ROW_RM].extend(indices)
            else:
                for column in self.df_columns:
                    self.strategy_cache[self.get_strategy_by_column(column)].append(column)
        return self.build_suggestions()

    def get_strategy_by_column(self, column):
        strategy = ImputationStrategy.NOOP
        if self.statistics[f"{column}/null_value_rate"] != 1:
            dtype = self.column_types[column]
            if dtype in NUMBER_TYPES:
                strategy = self.get_numerical_strategy(column)
            elif dtype in CATEGORICAL_TYPES:
                strategy = self.get_categorical_strategy(column)
            elif dtype in STRING_TYPES:
                strategy = self.__get_string_strategy()
            elif dtype in DATETIME:
                strategy = self.get_datetime_strategy(column)
            else:
                raise TypeError(f'Invalid column type \'{dtype}\' for column \'{column}\'')
        return strategy

    def get_categorical_strategy(self, column):
        longest_sequence = self.get_longest_null_seq(column)
        if self.statistics[f'{column}/count'] <= self.DATA_SM_UB:
            params = self.SM_LG_HYPERPARAMS["small"]
            if(self.statistics[f'{column}/count_distinct'] <= params["rand_max_unique_count"]
              and self.statistics[f'{column}/count'] >= params["rand_min_count"]):
                return ImputationStrategy.RANDOM
            elif longest_sequence <= self.MAX_NULL_SEQ_LENGTH:
                return ImputationStrategy.SEQ
        else:
            params = self.SM_LG_HYPERPARAMS["large"]
            if(self.statistics[f'{column}/null_value_rate'] <= params["rand_empty_ub"]):
                return ImputationStrategy.RANDOM
            elif longest_sequence <= self.MAX_NULL_SEQ_LENGTH:
                return ImputationStrategy.SEQ
        return ImputationStrategy.NOOP

    def get_datetime_strategy(self, column):
        longest_sequence = self.get_longest_null_seq(column)
        if longest_sequence <= self.MAX_NULL_SEQ_LENGTH:
            return ImputationStrategy.SEQ
        else:
            return ImputationStrategy.NOOP

    def get_longest_null_seq(self, column):
        longest_sequence = 0
        curr_sequence = 0
        for is_null in self.cleaned_df[column].isna():
            if is_null:
                curr_sequence += 1
            else:
                longest_sequence = max(longest_sequence, curr_sequence)
                curr_sequence = 0
        return longest_sequence

    def get_numerical_strategy(self, column):
        if self.statistics[f'{column}/count'] <= self.DATA_SM_UB:
            # this is a smaller dataset, need to enforce tougher restrictions
            hyperparams = self.SM_LG_HYPERPARAMS["large"]
            if self.statistics[f'{column}/null_value_rate'] <= hyperparams["avg_med_empty_ub"]:
                if abs(self.df[column].skew()) < self.SKEW_UB:
                    return ImputationStrategy.AVG
                else:
                    return ImputationStrategy.MED
            else:
                return ImputationStrategy.NOOP
        else:
            # this is a larger dataset, can be more lax
            hyperparams = self.SM_LG_HYPERPARAMS["small"]
            if self.statistics[f'{column}/null_value_rate'] <= hyperparams["avg_med_empty_ub"]:
                if abs(self.df[column].skew()) < self.SKEW_UB:
                    return ImputationStrategy.AVG
                else:
                    return ImputationStrategy.MED
            else:
                return ImputationStrategy.NOOP

    def __get_null_mask(self):
        null_mask = self.cleaned_df[self.df_columns[0]].isna()
        for column_name in self.df_columns[1:]:
            null_mask |= self.cleaned_df[column_name].isna()
        return null_mask

    def __get_string_strategy(self):
        return ImputationStrategy.NOOP


class ImputeActionConstructor():
    def __init__(self, df, column_types, action_builder):
        self.df = df
        self.df_columns = df.columns.tolist()
        self.column_types = column_types
        self.action_builder = action_builder

    def __call__(self, strategy, strategy_cache_entry):
        return self.construct_suggestion_from_strategy(strategy, strategy_cache_entry)

    def construct_suggestion_from_strategy(
        self,
        strategy,
        strategy_cache_entry
    ):
        title = 'Fill in missing values'
        message = ''
        action_type = None
        action_arguments = []
        action_code = ''
        action_options = {}
        action_variables = {}
        axis = None
        outputs = []

        if strategy == ImputationStrategy.AVG:
            message = 'The following columns have null-valued entries and '\
                      'the distribution of remaining values is approximately symmetric: '\
                      f'{strategy_cache_entry}. ' \
                      'Suggested: fill null values with the average value from each column.'
            action_arguments = strategy_cache_entry
            action_type = ActionType.IMPUTE
            axis = Axis.COLUMN
            action_options = {"strategy": strategy}
            action_variables = self.__construct_action_variables(strategy_cache_entry)
        elif strategy == ImputationStrategy.MED:
            message = 'The following columns have null-valued entries and '\
                      'the distribution of remaining values is skewed: ' \
                      f'{strategy_cache_entry}. ' \
                      'Suggested: fill null values with the median value from each column.'
            action_arguments = strategy_cache_entry
            action_type = ActionType.IMPUTE
            axis = Axis.COLUMN
            action_options = {"strategy": strategy}
            action_variables = self.__construct_action_variables(strategy_cache_entry)
        elif strategy == ImputationStrategy.RANDOM:
            message = 'The following columns have null-valued entries and are categorical: '\
                      f'{strategy_cache_entry}. ' \
                      'Suggested: fill null values with a randomly sampled not null value.'
            action_arguments = strategy_cache_entry
            action_type = ActionType.IMPUTE
            axis = Axis.COLUMN
            action_options = {"strategy": strategy}
            action_variables = self.__construct_action_variables(strategy_cache_entry)
        elif strategy == ImputationStrategy.ROW_RM:
            title = "Remove rows with missing entries"
            message = 'The rows at the following indices have null values: '\
                      f'{strategy_cache_entry}. ' \
                      'Suggested: remove these rows to remove null values from the dataset.'
            action_arguments = self.df_columns
            action_type = ActionType.FILTER
            axis = Axis.ROW
            action_variables = self.__construct_action_variables(self.df_columns)
            action_code = " and ".join(map(lambda name: f"{name} != null", self.df_columns))
        elif strategy == ImputationStrategy.SEQ:
            message = 'The following columns have null-valued entries which '\
                      'may either be sparsely distributed, or these columns have '\
                      'sequential values: '\
                      f'{strategy_cache_entry}. ' \
                      'Suggested: fill null values with previously occurring value in sequence.'
            action_arguments = strategy_cache_entry
            action_type = ActionType.IMPUTE
            axis = Axis.COLUMN
            action_options = {"strategy": strategy}
            action_variables = self.__construct_action_variables(strategy_cache_entry)

        return self.action_builder(
            title,
            message,
            action_type,
            action_arguments,
            action_code,
            action_options,
            action_variables,
            axis,
            outputs
        )

    def __construct_action_variables(self, columns):
        variable_set = {}
        for column_name in columns:
            variable_set[column_name] = {
                'feature': {
                    'column_type': self.column_types[column_name],
                    'uuid': column_name,
                },
                'type': 'feature',
            }
        return variable_set
