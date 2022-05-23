from data_cleaner.cleaning_rules.base import BaseRule
from data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
)
from data_cleaner.column_type_detector import ( 
    TEXT, 
    CATEGORY, 
    CATEGORY_HIGH_CARDINALITY, 
    EMAIL,
    NUMBER,
    NUMBER_WITH_DECIMALS,
)
from datetime import datetime
import numpy as np

from mage_ai.data_cleaner.column_type_detector import DATETIME


class ReformatValuesSubRule():
    """
    Assumptions about subrules:
    - df will have all empty string values removed - all null values are either `None` or `np.nan`. This is asserted in `ReformatValues`
    - assume all columns are of `object` type - will need to check manually for actual dtype.
    - column_types give the correct inferred type always
    """
    def __init__(self, df, column_types, statistics, action_builder):
        self.df = df
        self.column_types = column_types
        self.statistics = statistics
        self.action_builder = action_builder
        self.clean_column_cache = {}

    def clean_column(self, column):
        """
        Removes all null entries from a specific column
        """
        return self.clean_column_cache.setdefault(column, self.df[column].dropna(axis=0))

    def get_column_dtype(self, column):
        """
        Will get the dtype of the first nonnull entry or returns None if there is no such entry
        """
        try:
            return type(self.clean_column(column).iloc[0])
        except IndexError:
            return None

    def evaluate(self, column):
        raise NotImplementedError('Children of ReformatValuesSubRule must override this method.')
    
    def get_suggestions(self):
        raise NotImplementedError('Children of ReformatValuesSubRule must override this method.')

class StandardizeCapitalizationSubRule(ReformatValuesSubRule):
    UPPERCASE_PATTERN = r'^[^a-z]*$'
    LOWERCASE_PATTERN = r'^[^A-Z]*$'
    NON_ALPH_PATTERN = r'[^A-Za-z]'
    ALPHABETICAL_TYPES = frozenset((CATEGORY_HIGH_CARDINALITY, CATEGORY, TEXT, EMAIL))
    NON_ALPH_UB = 0.4
    ALPH_RATIO_LB = 0.6

    def __init__(self, df, column_types, statistics, action_builder):
        super().__init__(df, column_types, statistics, action_builder)
        self.uppercase = []
        self.lowercase = []

    def filter_column_regex(self, df_column, regex_pattern):
        if df_column.empty:
            return 0, df_column
        meets_regex = df_column.str.match(regex_pattern)
        try:
            count = meets_regex.value_counts()[True]
        except KeyError:
            count = 0
        return count, df_column[~meets_regex]

    def evaluate(self, column):
        """
        Rule: 
        1. If column is not a category/string type which may have alphabet, no suggestion
        2. If non-null entries are not string, no suggestion
        3. If majority of entries are not majority alphabetical, no suggestion
        4. If all entries are same case, no suggestion
        5. Suggest the more prevalent occurrence (e.g., if most alphabetical entries are lowercase 
        text but some mixedcase and uppercase text, suggest conversion to lowercase)
        5a. If most alphabetical entries are mixedcase, suggest conversion to lowercase
        """
        dtype = self.column_types[column]
        if dtype in self.ALPHABETICAL_TYPES:
            clean_col = self.clean_column(column)
            exact_dtype = self.get_column_dtype(column)
            if exact_dtype is str: # will return str only if clean_col is nonempty
                non_alpha_ratio = clean_col.str.count(self.NON_ALPH_PATTERN) / clean_col.str.len()
                unfiltered_length =  self.statistics[f'{column}/count']
                clean_col = clean_col[non_alpha_ratio <= self.NON_ALPH_UB]
                new_length = clean_col.count()

                if new_length / unfiltered_length > self.ALPH_RATIO_LB:
                    uppercase, clean_col = self.filter_column_regex(clean_col, self.UPPERCASE_PATTERN)
                    lowercase, clean_col = self.filter_column_regex(clean_col, self.LOWERCASE_PATTERN)
                    mixedcase = clean_col.count()

                    number_alphabetical = uppercase + lowercase + mixedcase
                    uppercase_ratio = uppercase/number_alphabetical
                    lowercase_ratio = lowercase/number_alphabetical
                    mixedcase_ratio = mixedcase/number_alphabetical

                    if (uppercase_ratio != 1 and lowercase_ratio != 1):
                        max_case_style = max(uppercase_ratio, lowercase_ratio, mixedcase_ratio)
                        if max_case_style == uppercase_ratio:
                            self.uppercase.append(column)
                        else:
                            self.lowercase.append(column)

    def get_suggestions(self):
        suggestions = []
        payloads = {"uppercase": self.uppercase, "lowercase": self.lowercase}
        for case in payloads:
            if len(payloads[case]) != 0:
                suggestions.append(self.action_builder(
                    'Reformat values',
                    'The following columns have mixed capitalization formats: '
                    f'{payloads[case]}. '
                    f'Reformat these columns with fully {case} text to improve data quality.',
                    'reformat',
                    action_arguments=payloads[case],
                    axis=Axis.COLUMN,
                    action_options = {
                        'reformat': 'standardize_capitalization',
                        'capitalization': case
                    }
                ))
        return suggestions


class ConvertCurrencySubRule(ReformatValuesSubRule):
    CURRENCY_PATTERN = r'^(?:[\$\€\¥\₹\元\£]|(?:Rs)(?:CAD))[\s\t]*[0-9]*\.{0,1}[0-9]+$'
    CURRENCY_TYPES = frozenset((
        CATEGORY, CATEGORY_HIGH_CARDINALITY, TEXT, NUMBER, NUMBER_WITH_DECIMALS
    ))
    CURRENCY_TYPE_LB = 0.6

    def __init__(self, df, column_types, statistics, action_builder):
        super().__init__(df, column_types, statistics, action_builder)
        self.matches = []

    def evaluate(self, column):
        """
        Rule:
        1. If the entry is not a text, number, or category, no suggestion
        2. If the entry is not a string type, it can't contain currency symbol, no suggestion
        3. If the majority of entries are of currency type (currency symbol followed by number), 
           suggest removal; else don't
        """
        dtype = self.column_types[column]
        if dtype in self.CURRENCY_TYPES :
            clean_col = self.clean_column(column)
            exact_dtype = self.get_column_dtype(column)
            if exact_dtype is str:
                currency_pattern_mask = clean_col.str.match(self.CURRENCY_PATTERN)
                try:
                    count = currency_pattern_mask.value_counts()[True]
                except KeyError:
                    count = 0
                if count / self.statistics[f'{column}/count'] >= self.CURRENCY_TYPE_LB:
                    self.matches.append(column)
                

    def get_suggestions(self):
        suggestions = []
        if len(self.matches) != 0:
            suggestions.append(self.action_builder(
                'Reformat values',
                'The following columns have currency type values: '
                f'{self.matches}. '
                'Reformat these columns as numbers to improve data quality.',
                'reformat',
                action_arguments=self.matches,
                axis=Axis.COLUMN,
                action_options = {
                    'reformat': 'currency',
                }
            ))
        return suggestions

class ReformatValues(BaseRule):
    RULE_LIST = [
        StandardizeCapitalizationSubRule,
        ConvertCurrencySubRule
    ]
    def __init__(self, df, column_types, statistics):
        super().__init__(df, column_types, statistics)
        self.cleaned_df = self.df.copy().applymap(
            lambda x: x if (not isinstance(x, str) or
            (len(x) > 0 and not x.isspace())) else np.nan
        )

    def hydrate_rule_list(self):
        return list(map(
            lambda x: x(
                self.cleaned_df, 
                self.column_types, 
                self.statistics,
                self._build_transformer_action_suggestion
            ),
            self.RULE_LIST
        ))

    def evaluate(self):
        rules = self.hydrate_rule_list()
        for column in self.df_columns:
            for rule in rules:
                rule.evaluate(column)
        suggestions = []
        for rule in rules:
            suggestions.extend(rule.get_suggestions())
        return suggestions