from pandas import DataFrame
from mage_ai.data_cleaner.cleaning_rules.base import BaseRule
from mage_ai.data_cleaner.shared.utils import wrap_column_name
from mage_ai.data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis,
)
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from typing import Union, Dict
import numpy as np

ITREE_ANOMALY_SCORE_THRESHOLD = -0.10
LOF_ANOMALY_SCORE_THRESHOLD = -1.5
REMOVE_OUTLIERS_TITLE = 'Remove outliers'


class RemoveOutliers(BaseRule):
    """
    Checks dataframe for the existence of potential outliers, and generates a cleaning suggestion
    to remove these outliers
    """

    def __init__(self, df, column_types, statistics):
        super().__init__(df, column_types, statistics)
        self.numeric_df, self.numeric_columns = self._filter_numeric_types()
        self.numeric_indices = np.arange(len(self.numeric_df))
        self.pca_transformer = PCA(n_components=20)

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
                f'Remove {outlier_count} outlier(s) to reduce the amount of noise in the data.',
                ActionType.FILTER,
                action_arguments=[column],
                action_code=f'{wrapped_c} <= {upper} and {wrapped_c} >= {lower}',
                axis=Axis.ROW,
            )
        return None

    def multi_dim_outlier_check(self, df: DataFrame, ndim: int) -> Union[Dict, None]:
        """
        Checks multivariate data for multidimensional outliers. The algorithm followed is as such:
        1. If the data is more than 20 dimensional, reduce to 20 dimensions using principal component analysis
        2. If there are 2 or more dimensions but less than or equal to 5 dimensions, use Local Outlier Factor method (LOF) to calculate
           outliers. This is faster for smaller data size - theoretically, runtime of LOF grows quadratically with input
        3. Otherwise, use Isolation Forests

        Args:
            df (DataFrame): Dataframe consisting of the numerical columns to perform outlier checks on
            ndim (int): Number of dimensions for each example in dataframe

        Returns:
            Union[Dict, None]: If a suggestion is made, returns the suggestion dictionary. Else returns `None`
        """
        data = df.to_numpy()
        count = data.shape[0]
        if ndim > 20:
            data = self.pca_transformer.fit_transform(data)
        if ndim <= 5:
            if count == 1:
                n_neighbors = 1
            elif count < 10:
                n_neighbors = 2
            elif count < 500:
                n_neighbors = count // 10 + 1
            else:
                n_neighbors = 20
            outlier_algorithm = LocalOutlierFactor(n_neighbors=n_neighbors, n_jobs=-1)
            outlier_algorithm.fit(data)
            outlier_scores = outlier_algorithm.negative_outlier_factor_
            outlier_mask = outlier_scores <= LOF_ANOMALY_SCORE_THRESHOLD
        else:
            n_estimators = max(100 - count // 10, 25)
            outlier_algorithm = IsolationForest(
                n_estimators=n_estimators, n_jobs=-1, random_state=42
            )
            outlier_algorithm.fit(data)
            outlier_scores = outlier_algorithm.decision_function(data)
            outlier_mask = outlier_scores <= ITREE_ANOMALY_SCORE_THRESHOLD
        outlier_count = outlier_mask.sum()
        if outlier_count > 0:
            return self._build_transformer_action_suggestion(
                REMOVE_OUTLIERS_TITLE,
                f'Remove {outlier_count} outlier(s) to reduce the amount of noise in the data.',
                ActionType.REMOVE,
                action_arguments=df.index[outlier_mask].tolist(),
                axis=Axis.ROW,
            )
        return None

    def evaluate(self):
        suggestions = []
        ndim = len(self.numeric_columns)
        suggestion = None
        if len(self.numeric_df) > 0:
            if ndim == 1:
                suggestion = self.one_dim_outlier_check(self.numeric_columns[0])
            elif ndim >= 2:
                suggestion = self.multi_dim_outlier_check(self.numeric_df, ndim)
            if suggestion:
                suggestions.append(suggestion)
        return suggestions
