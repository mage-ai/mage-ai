from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
import numpy as np


class RemoveCollinearColumns(BaseRule):
    EPSILON = 1e-15
    MIN_ENTRIES = 3
    VDP_UB = .5


    def __init__(self, df, column_types, statistics):
        super().__init__(df, column_types, statistics)
        self.numeric_df, self.numeric_columns = self._filter_numeric_types()
        self.numeric_indices = np.arange(len(self.numeric_df))

    def evaluate(self):
        n_cols = len(self.numeric_df)
        suggestions = []
        if self.numeric_df.empty or n_cols < self.MIN_ENTRIES:
            return suggestions

        X = self.numeric_df.assign(bias=1.).to_numpy()
        X /= np.linalg.norm(X, axis=0)
        _, evecs = np.linalg.eigh(X.T @ X)
        vdps = evecs / np.sum(evecs*evecs, axis=0)

        problem = vdps < self.VDP_UB
        for i in range(n_cols+1):
            problem[i, i] = 0
        problem_columns = []

        # remove near-constant columns
        near_constant = problem[:, -1] or problem[-1, :]
        problem = problem[:-1, :-1]
        for i in range(n_cols):
            if near_constant[i]:
                problem[:, i] = 0
                problem[i, :] = 0
                problem_columns.append(self.numeric_columns[i])

        problem.astype(int)
        c_sums = problem.sum(axis=0)
        r_sums = problem.sum(axis=1)
        t_sums = c_sums + r_sums
        
        while t_sums.sum() > 0:
            i = np.argmax(t_sums)
            problem[:, i] = 0
            problem[i, :] = 0
            problem_columns.append(self.numeric_columns[i])

        if len(problem_columns) != 0:
            suggestions.append(
                self._build_transformer_action_suggestion(
                    'Remove collinear and near-constant columns',
                    'Delete these columns to remove redundant data, and increase quality.',
                    ActionType.REMOVE,
                    action_arguments=problem_columns,
                    axis=Axis.COLUMN,
                )
            )
        return suggestions

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
