from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
import numpy as np


class RemoveCollinearColumns(BaseRule):
    EPSILON = 1e-15
    MIN_ENTRIES = 3
    VIF_UB = 5

    default_config = dict(
        vif_ub=3,
    )

    def __init__(self, df, column_types, statistics, custom_config={}):
        super().__init__(df, column_types, statistics, custom_config=custom_config)
        self.numeric_df, self.numeric_columns = self._filter_numeric_types()
        self.numeric_indices = np.arange(len(self.numeric_df))

    def evaluate(self):
        suggestions = []
        if self.numeric_df.empty or len(self.numeric_df) < self.MIN_ENTRIES:
            return suggestions

        sigma = self.numeric_df.cov().to_numpy()
        std = self.numeric_df.std().to_numpy()
        pairwise_std = std * np.expand_dims(std, axis=1)
        C = sigma / (pairwise_std + self.EPSILON)

        collinear_columns = []
        good_columns = self.numeric_columns.copy()
        while True:
            e_vals = np.linalg.eigvalsh(C)
            vifs = np.sign(e_vals) / (abs(e_vals) + self.EPSILON)
            collinearity = vifs >= self.VIF_UB

            if len(collinearity) == 0:
                break
            i = collinearity.argmax()
            if i == 0 and collinearity[0] == 0:
                break
            else:
                C = np.delete(C, i, axis=0)
                C = np.delete(C, i, axis=1)
                collinear_columns.append(good_columns.pop(i))

        if len(collinear_columns) != 0:
            suggestions.append(
                self._build_transformer_action_suggestion(
                    'Remove collinear columns',
                    'Delete these columns to remove redundant data and increase data quality.',
                    ActionType.REMOVE,
                    action_arguments=collinear_columns,
                    axis=Axis.COLUMN,
                )
            )
        return suggestions
