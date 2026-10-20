from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
)


class RemoveColumnsWithSingleValue(BaseRule):

    # Check statistic [feature_uuid]/count_distinct
    def evaluate(self):
        columns_with_single_value = []
        for c in self.df_columns:
            if f'{c}/count_distinct' not in self.statistics:
                continue
            feature_count_distinct = self.statistics[f'{c}/count_distinct']
            if feature_count_distinct == 1:
                columns_with_single_value.append(c)
        suggestions = []
        if len(columns_with_single_value) != 0:
            suggestions.append(
                self._build_transformer_action_suggestion(
                    'Remove columns with single value',
                    'Remove columns with a single unique value to reduce the amount of '
                    'redundant data.',
                    ActionType.REMOVE,
                    action_arguments=columns_with_single_value,
                    axis=Axis.COLUMN,
                )
            )
        return suggestions
