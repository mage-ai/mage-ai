from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.shared.utils import wrap_column_name
from mage_ai.data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
)

REMOVE_OUTLIERS_TITLE = 'Remove outliers'


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

            wrapped_c = wrap_column_name(c)
            suggestions.append(
                self._build_transformer_action_suggestion(
                    REMOVE_OUTLIERS_TITLE,
                    f'Remove {outlier_count} outlier(s) to reduce the amount of noise in the data.',
                    ActionType.FILTER,
                    action_arguments=[c],
                    action_code=f'{wrapped_c} <= {upper} and {wrapped_c} >= {lower}',
                    axis=Axis.ROW,
                )
            )
        return suggestions
