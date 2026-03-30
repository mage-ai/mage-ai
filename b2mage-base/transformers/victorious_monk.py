from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@transformer
def execute_transformer_action(df: DataFrame, *args, **kwargs) -> DataFrame:
    """
    Execute Transformer Action: ActionType.YENİ_AKSİYON

    Açıklama buraya.
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.AVERAGE,  # Uygun ActionType ile değiştir
        action_code='',
        arguments=[],  # Aggregate yapılacak sütunlar
        axis=Axis.COLUMN,
        options={'groupby_columns': []},  # Group by sütunları
        outputs=[
            {'uuid': 'b2metric_column_aggregate', 'column_type': 'number_with_decimals'},
        ],
    )

    return BaseAction(action).execute(df)


@test
def test_output(output, *args) -> None:
    """
    Template code for testing the output of the block.
    """
    assert output is not None, 'The output is undefined'