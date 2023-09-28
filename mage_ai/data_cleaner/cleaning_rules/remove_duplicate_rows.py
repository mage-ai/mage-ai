from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
)


class RemoveDuplicateRows(BaseRule):
    def evaluate(self):
        df_dedupe = self.df.drop_duplicates()
        duplicate_row_count = self.df.shape[0] - df_dedupe.shape[0]
        suggestions = []
        if duplicate_row_count > 0:
            suggestions.append(
                self._build_transformer_action_suggestion(
                    'Remove duplicate rows',
                    f'Remove {duplicate_row_count} duplicated row(s) to reduce the amount of '
                    'redundant data.',
                    ActionType.DROP_DUPLICATE,
                    action_arguments=[],
                    axis=Axis.ROW,
                )
            )
        return suggestions
