from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.column_type_detector import NUMBER_TYPES
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
        suggestions = []
        if self.numeric_df.empty or len(self.numeric_df) < self.MIN_ENTRIES:
            return suggestions
        collinear_columns = []
        self.numeric_df['intercept'] = np.ones(len(self.numeric_df))
        for column in self.numeric_columns[:-1]:
            variance_inflation_factor = self.get_variance_inflation_factor(column)
            if variance_inflation_factor > self.VIF_UB:
                collinear_columns.append(column)
                self.numeric_df.drop(column, axis=1, inplace=True)
        if len(collinear_columns) != len(self.numeric_columns) - 1:
            # check the final column if and only if there are other columns to compare it to
            column = self.numeric_columns[-1]
            variance_inflation_factor = self.get_variance_inflation_factor(column)
            if variance_inflation_factor > self.VIF_UB:
                collinear_columns.append(column)
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

    def get_variance_inflation_factor(self, column):
        """
        Variance Inflation Factor = 1 / (1 - <coefficient of determination on column k>)
        Measures increase in regression model variance due to collinearity
        => column k is multicollinear with others if model predicting its value
        has this variance inflation greater than some amount
        """
        if self.numeric_df.empty:
            raise RuntimeError('No other columns to compare \'{column}\' against')
        if len(self.numeric_df) > self.ROW_SAMPLE_SIZE:
            sample = self.numeric_df.sample(self.ROW_SAMPLE_SIZE)
        else:
            sample = self.numeric_df

        responses = sample[column].to_numpy()
        predictors = sample.drop(column, axis=1).to_numpy()
        params, _, _, _ = np.linalg.lstsq(predictors, responses, rcond=None)

        mean = responses.mean()
        centered_predictions = predictors @ params - mean
        sum_sq_model = np.sum(centered_predictions * centered_predictions)
        centered_responses = responses - mean
        sum_sq_to = np.sum(centered_responses * centered_responses)
        r_sq = sum_sq_model / sum_sq_to if sum_sq_to else 0
        return 1 / (1 - r_sq + self.EPSILON)
