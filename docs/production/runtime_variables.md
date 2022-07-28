# Runtime Variables
Runtime Variables are a set of global variables that can be used by every block. These are useful for storing constants shared by multiple blocks or constants whose value is determined at pipeline runtime (hence _runtime_ variables).

## Example
Consider the following sample data tracking the launch angle (in degrees) and vertical velocity (in meters per second) of model rocket tests:

| launch_id | angle | vertical_velocity |
| --------- | ----- | ----------------- |
| 1         | 28.4  | 61.34             |
| 2         | 14.4  | 32.03             |
| 3         | 61.4  | 113.19            |
| 4         | 44.2  | 89.96             |
| 5         | 39.5  | 82.00             |
| 6         | 79.3  | 126.73            |
| 7         | 74.9  | 124.51            |
| 8         | 38.1  | 79.6              |


Suppose we want to convert the launch angle from degrees to radians in our pipeline. The example below uses the `pi` runtime variable (passed in through `**kwargs`) to convert the degrees column of some input data frame to a radians. This allows us to control the precision with which we want to store `pi`.

```python
from pandas import DataFrame
from os import path

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


@transformer
def convert_to_radians(df: DataFrame, **kwargs) -> DataFrame:
    pi = kwargs.get('pi')
    df['angle_radians'] = df['angle'] * pi / 180
    return df
```

Suppose also want to convert the velocity from meters per second to kilometers per hour by multiplying by the constant 3.6. Using the runtime variable `conversion_factor` (again passed in through `**kwargs`), the vertical velocity in kilometers per hour can be computed:

```python
from pandas import DataFrame
from os import path

if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer


@transformer
def convert_velocity(df: DataFrame, **kwargs) -> DataFrame:
    conversion_factor = kwargs.get('conversion_factor')
    df['converted_vertical_velocity'] = df['vertical_velocity'] * conversion_factor
    return df
```
Now that your pipeline is complete, you can run your pipeline using `mage_ai.run()`. Specify values for runtime variables as keyword arguments to this function:

```python
mage_ai.run('model_rocket_data_ingestion', 'repos/default_repo', pi=3.1415, conversion_factor=3.6)
```
Suppose after creating your pipeline, you instead want to store your velocity in miles per hour instead of kilometers per hour. As the conversion factor is a runtime variable, you don't have to edit your pipeline - you just have to change the conversion factor which your pipeline is run with!

```python
mage_ai.run('model_rocket_data_ingestion', 'repos/default_repo', pi=3.1415, conversion_factor=2.24)
```
## Using Runtime Variables

Runtime Variables can be accessed via the `**kwargs` parameter in your block function.

```python
from pandas import DataFrame
from os import path

if 'data_loader' not in globals():
    from mage_ai.data_preparation.decorators import data_loader


@data_loader
def loader_data(**kwargs) -> DataFrame:
    filepath = kwargs.get('filepath')
    row_limit = kwargs.get('row_limit')
    return pd.read_csv(filepath, nrows=row_limit)
```

Currently, runtime variables must be of primitive Python types or some basic containers:
- integer
- string
- float
- boolean
- list
- dictionary
- set

Runtime variable names must be a valid Python identifier (i.e., no spaces in name, can't start with a number).

## Creating Runtime Variables In-Editor

**_WIP_**

## Running Pipeline with Runtime Variables

If your pipeline is configured to use runtime variables, you can still execute your pipeline outside the code editor. Provide the runtime variables as keyword arguments to `mage_ai.run()`:

```python
mage_ai.run('sample_pipeline', 'repos/default_repo', filepath = 'path/to/my/file.csv', row_limit=1000)
```