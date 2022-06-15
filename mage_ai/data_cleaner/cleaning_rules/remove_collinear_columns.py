from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.column_types.constants import NUMBER_TYPES
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
import numpy as np


class RemoveCollinearColumns(BaseRule):
    EPSILON = 1e-12
    MIN_ENTRIES = 3
    ROW_SAMPLE_SIZE = 300
    VIF_UB = 5

    def __init__(self, df, column_types, statistics):
        super().__init__(df, column_types, statistics)
        self.numeric_df, self.numeric_columns = self.filter_numeric_types()
        self.numeric_indices = np.arange(len(self.numeric_df))

    def evaluate(self):
        """ Evaluate columns for collinearity with Variance Inflation Factor.
        VIF = 1 / (1 - <coefficient of determination on column k>)
        Measures increase in regression model variance due to multicollinearity
        => column k is multicollinear with others if model predicting its value
        has this variance inflation greater than some amount
        """
        suggestions = []
        if self.numeric_df.empty or len(self.numeric_df) < self.MIN_ENTRIES:
            return suggestions
        collinear_columns = []
        self.numeric_df['intercept'] = np.ones(len(self.numeric_df))

        C = np.corrcoef(self.numeric_df.to_numpy().T)
        vifs = np.diagonal(np.linalg.pinv(C, hermitian=True))
        collinear_columns = [num_col for vif, num_col in
                                 zip(vifs, self.numeric_columns) if vif > self.VIF_UB]
        if len(collinear_columns) != 0:
            suggestions.append(
                self._build_transformer_action_suggestion(
                    'Remove collinear columns',
                    'Delete some of these columns to remove '
                    'redundant data and increase data quality.',
                    ActionType.REMOVE,
                    action_arguments=collinear_columns,
                    axis=Axis.COLUMN,
                )
            )
        return suggestions

    def filter_numeric_types(self):
        numeric_columns = []
        numeric_df = self.df.copy()
        for column in self.df_columns:
            if self.column_types[column] in NUMBER_TYPES:
                numeric_df.loc[:, column] = numeric_df.loc[:, column].astype(float)
                numeric_columns.append(column)
            else:
                numeric_df.drop(column, axis=1, inplace=True)
        numeric_df = numeric_df.dropna(axis=0)
        return numeric_df, numeric_columns