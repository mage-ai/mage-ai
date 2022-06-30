from mage_ai.data_cleaner.transformer_actions.base import BaseAction, Axis
from mage_ai.data_cleaner.transformer_actions.constants import ActionType
from mage_ai.data_cleaner.transformer_actions.utils import (
    build_action_variables,
    build_transformer_action,
)
from pandas import DataFrame


def execute_transformer_action(df: DataFrame) -> DataFrame:
    """
    Template code for transforming data frame using the `transformer_actions`
    library. See library documentation for the required payload parameters when constructing
    the action below.
    """
    action = build_transformer_action(
        action_type=ActionType.CUSTOM,  # Specify the transformer action to perform
        action_arguments=[],  # Specify the columns of data frame to apply the action tos
        action_variables=build_action_variables(df),
        axis=Axis.COLUMN,  # Specify the axis of data frame to apply action to
    )
    return BaseAction(action).execute(df)
