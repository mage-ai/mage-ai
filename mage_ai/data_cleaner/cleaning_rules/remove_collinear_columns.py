from data_cleaner.cleaning_rules.base import BaseRule
from data_cleaner.column_type_detector import NUMBER_TYPES
from data_cleaner.transformer_actions.constants import ActionType, Axis
import numpy as np


class RemoveCollinearColumns(BaseRule):
    VIF_UB = 5
    MIN_ENTRIES = 3
    ROW_SAMPLE_SIZE = 300
    EPSILON = 1e-12

    def __init__(self, df, column_types, statistics):
        super().__init__(df, column_types, statistics)
        self.numeric_df, self.numeric_columns = self.filter_numeric_types()
        self.rng = np.random.default_rng()
        self.numeric_indices = np.arange(len(self.numeric_df))

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
        return cleaned_df, numeric_columns

    def get_variance_inflation_factor(self, column):
        """
        Variance Inflation Factor = 1 / (1 - <coefficient of determination on column k>)
        Measures increase in regression model variance due to collinearity 
        => column k is multicollinear with others if model predicting its value 
        has this variance inflation greater than some amount
        """
        if self.numeric_df.empty:
            raise RuntimeError('No other columns to compare \'{column}\' against')
        self.rng.shuffle(self.numeric_indices)
        sample_indices = self.numeric_indices[:self.ROW_SAMPLE_SIZE]
        sample = self.numeric_df.iloc[sample_indices]

        responses = sample[column].to_numpy()
        predictors = sample.drop(column, axis=1).to_numpy()
        params, _, _, _ = np.linalg.lstsq(predictors, responses, rcond=None)

        predictions = predictors @ params
        sum_sq_model = np.sum(predictions * predictions)
        sum_sq_to = np.sum(responses * responses)

        r_sq = sum_sq_model / sum_sq_to
        return 1 / (1 - r_sq + self.EPSILON)

    def evaluate(self):
        suggestions = []
        if not self.numeric_df.empty and len(self.numeric_df) > self.MIN_ENTRIES:
            collinear_columns = []
            for column in self.numeric_columns[:-1]:
                variance_inflation_factor = self.get_variance_inflation_factor(column)
                if variance_inflation_factor > self.VIF_UB:
                    collinear_columns.append(column)
                    self.numeric_df.drop(column, axis=1, inplace=True) 
            if len(collinear_columns) != len(self.numeric_columns)-1:
                # check the final column if and only if there are other columns to compare it to
                column = self.numeric_columns[-1]
                variance_inflation_factor = self.get_variance_inflation_factor(column)
                if variance_inflation_factor > self.VIF_UB:
                    collinear_columns.append(column)
            if len(collinear_columns) != 0:
                suggestions.append(self._build_transformer_action_suggestion(
                    'Remove collinear columns',
                    'The following columns are strongly correlated with other columns in the'
                    f'dataset: {collinear_columns}. '
                    'Removing these columns may increase data quality by removing redundant '
                    'and closely related data.',
                    ActionType.REMOVE,
                    action_arguments=collinear_columns,
                    axis=Axis.COLUMN,
                ))
        return suggestions
