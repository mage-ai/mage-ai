from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


@transformer
def execute_transformer_action(df: DataFrame, *args, **kwargs) -> DataFrame:
    """
    Execute Transformer Action: ActionType.SORT
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.SORT,
        arguments=[],  # Specify columns to sort rows by
        axis=Axis.ROW,
        options={'ascending': True},
    )

    return BaseAction(action).execute(df)
