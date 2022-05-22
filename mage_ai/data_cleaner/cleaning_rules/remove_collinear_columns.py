from data_cleaner.cleaning_rules.base import BaseRule
from data_cleaner.column_type_detector import NUMBER_TYPES
from data_cleaner.transformer_actions.constants import (
    ActionType,
    Axis
)
import numpy as np

class RemoveCollinearColumns(BaseRule):
    R_SQUARED_UB = 0.7

    def __map_numeric_types(self):
        cleaned_df = self.df.copy().applymap(
            lambda x: x if (not isinstance(x, str) or
            (len(x) > 0 and not x.isspace())) else np.nan
        )
        for column in self.df_columns:
            if self.column_types[column] in NUMBER_TYPES:
                cleaned_df[column] = cleaned_df[column].astype(float)
        return cleaned_df

    def evaluate(self):
        cleaned_df = self.__map_numeric_types()
        corr_df = cleaned_df.corr()
        corr_column_set = corr_df.columns.tolist()

        corr_matrix = corr_df.to_numpy()
        corr_matrix *= corr_matrix # get r_squared
        corr_matrix = np.triu(corr_matrix, k=1) # remove symmetry so only one pair of cols exists if any
        pairs_of_collinear_columns = np.argwhere(corr_matrix > self.R_SQUARED_UB)
        
        suggestions = []
        for pair in pairs_of_collinear_columns:
            col1, col2 = pair[0], pair[1]
            col1_name, col2_name = corr_column_set[col1], corr_column_set[col2]
            suggestions.append(self._build_transformer_action_suggestion(
                'Remove collinear columns',
                f'The following columns are strongly correlated: \'{col1_name}\' and \'{col2_name}\'. '
                f'Removing \'{col2_name}\' may increase data quality and remove redundant data.',
                ActionType.REMOVE,
                action_arguments=[col2_name],
                axis=Axis.COLUMN,
            ))
        return suggestions
