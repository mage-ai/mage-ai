# Testing

## Data validation

Every data loader and transformer block has data validation capabilities built-in.

You can define 1 or more test functions in a single block.
Each test function accepts a data object as an argument.

Within the body of the function, you can write any type of test you want to validate the input data.

After the block’s main code is executed,
the output data is passed into each test function for validation.
If any tests fail, then the block run will also fail.

<br />

### Example

Here is an example of a transformer block with 2 tests:

```python
from pandas import DataFrame

COLUMNS_TO_USE = ['name']


@transformer
def transform_df(df: DataFrame, *args, **kwargs) -> DataFrame:
    return df.iloc[:1][COLUMNS_TO_USE]


@test
def test_output(df) -> None:
    assert len(df.index) >= 2, 'The output has more than 1 row.'


@test
def test_output(df) -> None:
    assert df.columns[0] != COLUMNS_TO_USE[0], 'The output columns don’t match.'
```

> NOTE
>
> You can combine all your data validations into 1 test function or you can split them up into
multiple test functions. The benefit of splitting them up is that they can run in parallel,
speeding up the data validation.

<br />

### Log output

Each test run is recorded and can be viewed in the logs. Here is an example:

```
Start executing block.
--------------------------------------------------------------
2/2 tests passed.
Finish executing block.
```

<br />
