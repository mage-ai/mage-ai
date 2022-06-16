from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
)
import numpy as np
from scipy.stats import entropy


class RemoveUninformativeColumns(BaseRule):

    # Check statistic [feature_uuid]/count_distinct
    def evaluate(self):
        ents = np.zeros(len(self.df_columns))
        for i, col in enumerate(self.df):
            _, freqs = np.unique(col.to_numpy(), return_counts=True)
            ents[i] = entropy(freqs, base=10)

        low_info_cols = [col for ent, col in zip(ents, cols) if ents < 0.2]
        suggestions = []
        suggestions.append(
            self._build_transformer_action_suggestion(
                'Remove uninformative columns',
                'Remove uninformative columns to reduce the amount of redundant data.',
                ActionType.REMOVE,
                action_arguments=low_info_cols,
                axis=Axis.COLUMN))
        return suggestions