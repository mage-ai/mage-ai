from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


@transformer
def execute_transformer_action(df: DataFrame, *args, **kwargs) -> DataFrame:
    """
    Execute Transformer Action: ActionType.SHIFT_DOWN

    Shifts value in the selected column down by specified number periods.
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.SHIFT_DOWN,
        arguments=[],  # Specify one column to perform shift on
        axis=Axis.COLUMN,
        options={'periods': 1},
        outputs=[{'uuid': 'down_shifted_column_1', 'type': 'category'}],
    )

    return BaseAction(action).execute(df)
