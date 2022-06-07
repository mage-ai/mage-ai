from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
)


class RemoveOutliers(BaseRule):
    def evaluate(self):
        suggestions = []
        for c in self.df_columns:
            if f'{c}/outlier_count' not in self.statistics:
                continue
            outlier_count = self.statistics[f'{c}/outlier_count']
            if outlier_count == 0:
                continue
            std = self.statistics[f'{c}/std']
            avg = self.statistics[f'{c}/average']
            upper = avg + 3 * std
            lower = avg - 3 * std

            suggestions.append(
                self._build_transformer_action_suggestion(
                    'Remove outliers',
                    f'Remove {outlier_count} outlier(s) to reduce the amount of noise in the data.',
                    ActionType.FILTER,
                    action_arguments=[c],
                    action_code=f'{c} <= {upper} and {c} >= {lower}',
                    axis=Axis.ROW,
                )
            )
        return suggestions
