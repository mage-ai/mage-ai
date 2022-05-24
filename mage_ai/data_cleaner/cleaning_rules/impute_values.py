from data_cleaner.cleaning_rules.base import BaseRule
from data_cleaner.column_type_detector import (
    CATEGORICAL_TYPES,
    COLUMN_TYPES,
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


class TypeImputeSubRule():
    DATA_SM_UB = 100

    def __init__(self, df, column_types, statistics):
        """
        Assumptions of TypeImputeSubRule
        1. df will not contain any empty strings - all empty strings are converted to null types.
        This is handled in ImputeValues.
        2. column_types will contain the correct type value
        3. Every column in df is of dtype object and the entries must be used to infer type.
        This is not always the case, but this assumption simplifies code
        """
        self.df = df
        self.column_types = column_types
        self.statistics = statistics

    def accepted_dtypes(self):
        """
        Gets the list of dtypes this subrule accepts and checks
        """
        raise NotImplementedError(
            'Children of TypeImputeSubRule must override \'accepted_dtypes()\''
        )

    def evaluate(self, column):
        """
        Gets the imputation strategy for the given column
        """
        raise NotImplementedError(
            'Children of TypeImputeSubRule must override \'evaluate()\''
        )

    def get_longest_null_seq(self, column):
        """
        Gets the length of the longest consecutive sequence of null values observed in
        the column
        """
        longest_sequence = 0
        curr_sequence = 0
        for is_null in self.df[column].isna():
            if is_null:
                curr_sequence += 1
            else:
                longest_sequence = max(longest_sequence, curr_sequence)
                curr_sequence = 0
        return longest_sequence

    def get_statistics(self, column, statistic):
        """
        Gets the statistic requested. If not found, the statistic is calculated and cached
        for the next call
        """
        value = self.statistics.get(f'{column}/{statistic}')
        if value is None:
            if statistic == 'count':
                value = self.cleaned_df[column].count()
            elif statistic == 'count_distinct':
                value = self.cleaned_df[column].nunique()
            elif statistic == 'null_value_rate':
                value = 1 - self.cleaned_df[column].count() / len(self.cleaned_df[column])
            self.statistics[f'{column}/{statistic}'] = value
        return value


class NumericalImputeSubRule(TypeImputeSubRule):
    ACCEPTED_DTYPES = frozenset(NUMBER_TYPES)
    SKEW_UB = 0.7
    AVG_OR_MED_EMPTY_UB = {
        'small': 0.3,
        'large': 0.5
    }

    def accepted_dtypes(self):
        return self.ACCEPTED_DTYPES
    
    def evaluate(self, column):
        """
        Rule:
        1. If the number of nonnull entries is sell than DATA_SM_UB, use the
           small dataset bound; else use the large dataset bound
        2. If the null value rate of the column is greater than AVG_OR_MED_EMPTY_UB
           (which can vary for small vs large dataset), suggest no imputation (not enough values)
        3. If null value rate is less thatn AVG_OR_MED_EMPTY_UB and skew is less than SKEW_UB
           suggest imputing with mean value; else impute with median value
        """
        if self.get_statistics(column, 'count') <= self.DATA_SM_UB:
            avg_or_med_empty_ub = self.AVG_OR_MED_EMPTY_UB['small']
        else:
            avg_or_med_empty_ub = self.AVG_OR_MED_EMPTY_UB['large']
        
        if self.get_statistics(column, 'null_value_rate') <= avg_or_med_empty_ub:
            if abs(self.df[column].skew()) < self.SKEW_UB:
                return ImputationStrategy.AVERAGE
            else:
                return ImputationStrategy.MEDIAN
        return ImputationStrategy.NOOP


class CategoricalImputeSubRule(TypeImputeSubRule):
    ACCEPTED_DTYPES = frozenset(CATEGORICAL_TYPES)
    RAND_EMPTY_UB = 0.3
    MAX_NULL_SEQ_LENGTH = 4
    
    def accepted_dtypes(self):
        return self.ACCEPTED_DTYPES

    def evaluate(self, column):
        """
        Rule:
        1. If less than RAND_EMPTY_UB ratio of entries are null, use random imputation
        2. If the longest sequence of consecutive null values is less than MAX_NULL_SEQ_LENGTH
           impute using sequential method
        3. Else suggest no imputation (no good fit)
        """
        longest_sequence = self.get_longest_null_seq(column)
        if(self.get_statistics(column, 'null_value_rate') <= self.RAND_EMPTY_UB):
            return ImputationStrategy.RANDOM
        elif longest_sequence <= self.MAX_NULL_SEQ_LENGTH:
            return ImputationStrategy.SEQ
        return ImputationStrategy.NOOP

class DateTimeImputeSubRule(TypeImputeSubRule):
    ACCEPTED_DTYPES = frozenset((DATETIME,))
    MAX_NULL_SEQ_LENGTH = 4

    def accepted_dtypes(self):
        return self.ACCEPTED_DTYPES
    
    def evaluate(self, column):
        """
        Rule:
        1. If the longest sequence of consecutive null values is less than MAX_NULL_SEQ_LENGTH
           impute using sequential method
        2. Else suggest no imputation (no good fit)
        """
        longest_sequence = self.get_longest_null_seq(column)
        if longest_sequence <= self.MAX_NULL_SEQ_LENGTH:
            return ImputationStrategy.SEQ
        else:
            return ImputationStrategy.NOOP

class StringImputeSubRule(TypeImputeSubRule):
    ACCEPTED_DTYPES = frozenset(STRING_TYPES)
    RAND_EMPTY_UB = 0.3

    def accepted_dtypes(self):
        return self.ACCEPTED_DTYPES
    
    def evaluate(self, column):
        """
        Rule:
        1. If less than RAND_EMPTY_UB ratio of entries are null, use random imputation
        3. Else suggest no imputation (no good fit)
        """
        if(self.get_statistics(column, 'null_value_rate') <= self.RAND_EMPTY_UB):
            return ImputationStrategy.RANDOM
        return ImputationStrategy.NOOP

class ImputeValues(BaseRule):
    RULESET = (
        CategoricalImputeSubRule,
        DateTimeImputeSubRule,
        NumericalImputeSubRule,
        StringImputeSubRule
    )
    ROW_KEPT_LB = 0.7

    def __init__(self, df, column_types, statistics):
        super().__init__(df, column_types, statistics)
        self.action_constructor = ImputeActionConstructor(
            self.df, 
            self.column_types, 
            self._build_transformer_action_suggestion
        )
        self.cleaned_df = self.df.replace('^\s*$', np.nan, regex=True)
        self.strategy_cache = {
            ImputationStrategy.AVERAGE: [],
            ImputationStrategy.MEDIAN: [],
            ImputationStrategy.NOOP: [],
            ImputationStrategy.RANDOM: [],
            ImputationStrategy.ROW_RM: [],
            ImputationStrategy.SEQ: []
        }
        self.hydrate_rules()

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
        if self.df.empty:
            return []
        null_mask = self.get_null_mask()
        ratio_rows_kept = len(self.df[~null_mask]) / len(self.df)
        if ratio_rows_kept == 1:
            self.strategy_cache[ImputationStrategy.NOOP].extend(self.df_columns)
        elif ratio_rows_kept >= self.ROW_KEPT_LB:
            indices = self.df[null_mask].index
            self.strategy_cache[ImputationStrategy.ROW_RM].extend(indices)
        else:
            for column in self.df_columns:
                dtype = self.column_types[column]
                rule = self.rule_map[dtype]
                self.strategy_cache[rule.evaluate(column)].append(column)
        return self.build_suggestions()

    def get_null_mask(self):
        null_mask = self.cleaned_df[self.df_columns[0]].isna()
        for column_name in self.df_columns[1:]:
            null_mask |= self.cleaned_df[column_name].isna()
        return null_mask


    def hydrate_rules(self):
        self.rules = list(
            map(lambda x: x(self.cleaned_df, self.column_types, self.statistics),
            self.RULESET)
        )

        self.rule_map = {}
        for dtype in COLUMN_TYPES:
            rule_iterator = iter(self.rules)
            curr_rule = next(rule_iterator)
            while dtype not in curr_rule.accepted_dtypes():
                try:
                   curr_rule = next(rule_iterator)
                except StopIteration:
                    raise RuntimeError(f'No rule found to handle imputation of type {dtype}')
            self.rule_map[dtype] = curr_rule


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

        if strategy == ImputationStrategy.AVERAGE:
            message = 'The following columns have null-valued entries and '\
                      'the distribution of remaining values is approximately symmetric: '\
                      f'{strategy_cache_entry}. ' \
                      'Suggested: fill null values with the average value from each column.'
            action_arguments = strategy_cache_entry
            action_type = ActionType.IMPUTE
            axis = Axis.COLUMN
            action_options = {'strategy': strategy}
            action_variables = self.__construct_action_variables(strategy_cache_entry)
        elif strategy == ImputationStrategy.MEDIAN:
            message = 'The following columns have null-valued entries and '\
                      'the distribution of remaining values is skewed: ' \
                      f'{strategy_cache_entry}. ' \
                      'Suggested: fill null values with the median value from each column.'
            action_arguments = strategy_cache_entry
            action_type = ActionType.IMPUTE
            axis = Axis.COLUMN
            action_options = {'strategy': strategy}
            action_variables = self.__construct_action_variables(strategy_cache_entry)
        elif strategy == ImputationStrategy.RANDOM:
            message = 'The following columns have null-valued entries and are categorical: '\
                      f'{strategy_cache_entry}. ' \
                      'Suggested: fill null values with a randomly sampled not null value.'
            action_arguments = strategy_cache_entry
            action_type = ActionType.IMPUTE
            axis = Axis.COLUMN
            action_options = {'strategy': strategy}
            action_variables = self.__construct_action_variables(strategy_cache_entry)
        elif strategy == ImputationStrategy.ROW_RM:
            title = 'Remove rows with missing entries'
            message = 'The rows at the following indices have null values: '\
                      f'{strategy_cache_entry}. ' \
                      'Suggested: remove these rows to remove null values from the dataset.'
            action_arguments = self.df_columns
            action_type = ActionType.FILTER
            axis = Axis.ROW
            action_variables = self.__construct_action_variables(self.df_columns)
            action_code = ' and '.join(map(lambda name: f'{name} != null', self.df_columns))
        elif strategy == ImputationStrategy.SEQ:
            message = 'The following columns have null-valued entries which '\
                      'may either be sparsely distributed, or these columns have '\
                      'sequential values: '\
                      f'{strategy_cache_entry}. ' \
                      'Suggested: fill null values with previously occurring value in sequence.'
            action_arguments = strategy_cache_entry
            action_type = ActionType.IMPUTE
            axis = Axis.COLUMN
            action_options = {'strategy': strategy}
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
