if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test

import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler

@transformer
def numeric_feature_scaler(df: pd.DataFrame, *args, **kwargs) -> pd.DataFrame:
    """
    Feature Scaler
    ──────────────
    CONFIG:
        method  : 'standard' | 'minmax' | 'robust' (default: 'standard')
        columns : list = None → None applies to all numeric columns
        exclude : list = []   → columns to skip (e.g. ID columns, target variable)
    """
    method  = kwargs.get('method', 'standard')
    columns = kwargs.get('columns', None)
    exclude = kwargs.get('exclude', [])

    scalers = {
        'standard': StandardScaler(),
        'minmax':   MinMaxScaler(),
        'robust':   RobustScaler(),
    }
    scaler = scalers.get(method, StandardScaler())

    num_cols = columns or df.select_dtypes(include='number').columns.tolist()
    num_cols = [c for c in num_cols if c not in exclude]

    df[num_cols] = scaler.fit_transform(df[num_cols])
    print(f"[SCALE] {method} applied to {num_cols}")
    return df

@test
def test_output(df, *args) -> None:
    assert df is not None, 'Output is undefined'
