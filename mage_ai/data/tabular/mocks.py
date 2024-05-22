from typing import Union

import numpy as np
import pandas as pd
import polars as pl

DEFAULT_ROWS = 1_000_000
DEFAULT_COLUMNS = 10


def create_dataframe(
    n_rows: int = DEFAULT_ROWS, n_cols: int = DEFAULT_COLUMNS, use_pandas: bool = False
) -> Union[pd.DataFrame, pl.DataFrame]:
    data = {f'col_{i}': np.random.rand(n_rows) for i in range(n_cols)}
    if use_pandas:
        df = pd.DataFrame(data)
    else:
        df = pl.DataFrame(data)
    return df
