if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test


@data_loader
def load_data(*args, **kwargs):
    import pandas as pd

    data = {
        "id": [1, 2, 3],
        "name": ["Omkar", "John", "Alice"],
        "amount": [100, 200, 300]
    }

    return pd.DataFrame(data)


@test
def test_output(output, *args) -> None:
    assert output is not None, 'The output is undefined'
    assert len(output) > 0, 'No data returned'