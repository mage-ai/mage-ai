from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


@transformer
def execute_transformer_action(df: DataFrame, *args, **kwargs) -> DataFrame:
    """
    Execute Transformer Action: ActionType.REMOVE
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.REMOVE,
        axis=Axis.ROW,
        options={'rows': []},  # Specify indices of rows to remove
    )

    return BaseAction(action).execute(df)
