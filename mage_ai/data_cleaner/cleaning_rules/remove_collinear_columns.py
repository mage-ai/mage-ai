from distutils.command.clean import clean
from data_cleaner.cleaning_rules.base import BaseRule
from data_cleaner.column_type_detector import NUMBER_TYPES
from data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis
)
import numpy as np

class RemoveCollinearColumns(BaseRule):
    VIF_UB = 5
    MIN_ENTRIES = 3
    EPSILON = 0.001

    def filter_numeric_types(self):
        cleaned_df = self.df.copy().applymap(
            lambda x: x if (not isinstance(x, str) or
            (len(x) > 0 and not x.isspace())) else np.nan
        )
        numeric_columns = []
        for column in self.df_columns:
            if self.column_types[column] in NUMBER_TYPES:
                cleaned_df[column] = cleaned_df[column].astype(float)
                numeric_columns.append(column)
            else:
                cleaned_df.drop(column, axis=1, inplace=True)
        cleaned_df = cleaned_df.dropna(axis=0)
        cleaned_df["intercept"] = np.ones((len(cleaned_df)))
        return cleaned_df, numeric_columns

    def get_variance_inflation_factor(self, column):
        """
        Variance Inflation Factor = 1 - <sum of squared residuals>/<sum of squared total error>
        Measures increase in regression model variance due to collinearity => column is collinear
        """
        responses = self.numeric_df[column].to_numpy()
        train_set = self.numeric_df.drop(column, axis=1).to_numpy()
        params, _, _, _ = np.linalg.lstsq(train_set, responses, rcond=None)

        residuals = responses - train_set @ params
        sum_sq_residuals = (residuals * residuals).sum()
        responses_std = responses.std()
        sum_sq_to = len(responses) * responses_std * responses_std

        r_sq = 1 - sum_sq_residuals / sum_sq_to
        return 1 / (1 - r_sq + self.EPSILON)

    def evaluate(self):
        self.numeric_df, self.numeric_columns = self.filter_numeric_types()
        suggestions = []
        if not self.numeric_df.empty and len(self.numeric_df) > self.MIN_ENTRIES:
            collinear_columns = []
            for column in self.numeric_columns:
                variance_inflation_factor = self.get_variance_inflation_factor(column)
                if variance_inflation_factor > self.VIF_UB:
                    collinear_columns.append(column)
                    self.numeric_df.drop(column, axis=1, inplace=True) # remove it so the remainder columns can be evaluated
            suggestions.append(self._build_transformer_action_suggestion(
                'Remove collinear columns',
                f'The following columns are strongly correlated with other columns in the dataset: {collinear_columns}. '
                f'Removing these columns may increase data quality by removing redundant '
                'and closely related data.',
                ActionType.REMOVE,
                action_arguments=collinear_columns,
                axis=Axis.COLUMN,
            ))
        return suggestions
