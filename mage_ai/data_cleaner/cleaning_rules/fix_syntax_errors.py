from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
)


class FixSyntaxErrors(BaseRule):
    def evaluate(self):
        columns_with_syntax_errors = []
        for column in self.df_columns:
            if self.statistics[f'{column}/invalid_value_rate'] > 0:
                columns_with_syntax_errors.append(column)

        suggestions = []
        if len(columns_with_syntax_errors):
            suggestions.append(
                self._build_transformer_action_suggestion(
                    title='Fix syntax errors',
                    message='Fix syntactical errors to reduce the amount of noise in the data.',
                    action_type=ActionType.FIX_SYNTAX_ERRORS,
                    action_arguments=columns_with_syntax_errors,
                    action_variables=self._build_action_variables(columns_with_syntax_errors),
                    axis=Axis.COLUMN,
                )
            )
        return suggestions
