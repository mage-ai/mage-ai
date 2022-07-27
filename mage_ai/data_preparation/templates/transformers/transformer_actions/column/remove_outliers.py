from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


@transformer
def execute_transformer_action(df: DataFrame, *args, **kwargs) -> DataFrame:
    """
    Execute Transformer Action: ActionType.REMOVE_OUTLIERS

    Warning: This method uses relative outlier checks, and so repeated executions of this
    transformer action will continue to remove data.
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.REMOVE_OUTLIERS,
        arguments=df.columns,  # Specify columns to remove outliers from
        axis=Axis.COLUMN,
        options={'method': 'auto'},  # Specify algorithm to use for outlier removal
    )

    return BaseAction(action).execute(df)
