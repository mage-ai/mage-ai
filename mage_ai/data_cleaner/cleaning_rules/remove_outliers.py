from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.shared.utils import wrap_column_name
from mage_ai.data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
)
from typing import Union, Dict
import numpy as np

REMOVE_OUTLIERS_TITLE = 'Remove outliers'


class RemoveOutliers(BaseRule):
    """
    Checks dataframe for the existence of potential outliers, and generates a cleaning suggestion
    to remove these outliers
    """

    def one_dim_outlier_check(self, column: str) -> Union[Dict, None]:
        """
        Checks univariate data for outliers by identifying data that lies more than 3 standard
        deviations outside the mean.

        Args:
            column (str): Column name of the univariate data

        Returns:
            Union[Dict, None]: If a suggestion is made, returns the suggestion dictionary. Else returns `None`
        """
        outlier_count = self.statistics.get(f'{column}/outlier_count')
        if outlier_count:
            std = self.statistics[f'{column}/std']
            avg = self.statistics[f'{column}/average']
            upper = avg + 3 * std
            lower = avg - 3 * std
            wrapped_c = wrap_column_name(column)
            return self._build_transformer_action_suggestion(
                REMOVE_OUTLIERS_TITLE,
                f'Remove {outlier_count} outlier(s) to reduce the amount of noise in this column.',
                ActionType.FILTER,
                action_arguments=[column],
                action_code=f'{wrapped_c} <= {upper} and {wrapped_c} >= {lower}',
                axis=Axis.ROW,
            )
        return None

    def evaluate(self):
        suggestions = []
        for col in self.df_columns:
            suggestion = self.one_dim_outlier_check(col)
            if suggestion:
                suggestions.append(suggestion)
        return suggestions
