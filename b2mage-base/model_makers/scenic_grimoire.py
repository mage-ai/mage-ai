if 'model_maker' not in globals():
    from mage_ai.data_preparation.decorators import model_maker
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@model_maker
def train(df, *args, **kwargs):
    # Write your Model Maker code here
    return {}


@test
def test_output(output, *args) -> None:
    """
    Template code for testing the output of the block.
    """
    assert output is not None, 'The output is undefined'