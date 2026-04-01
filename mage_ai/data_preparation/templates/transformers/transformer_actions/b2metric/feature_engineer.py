if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test

import pandas as pd
import numpy as np

@transformer
def feature_engineer(df: pd.DataFrame, *args, **kwargs) -> pd.DataFrame:
    """
    Feature Engineer
    ────────────────
    CONFIG:
        date_columns      : list → Derive year/month/day/dayofweek/is_weekend
        log_columns       : list → Apply log1p transform (for skewed distributions)
        ratio_pairs       : list → [('col_a', 'col_b')] → col_a / col_b ratio feature
        interaction_pairs : list → [('col_a', 'col_b')] → col_a * col_b product feature
        bin_columns       : dict → {'col': n_bins} → discretize via pd.cut
    """
    date_columns      = kwargs.get('date_columns', [])
    log_columns       = kwargs.get('log_columns', [])
    ratio_pairs       = kwargs.get('ratio_pairs', [])
    interaction_pairs = kwargs.get('interaction_pairs', [])
    bin_columns       = kwargs.get('bin_columns', {})

    for col in date_columns:
        if col in df.columns:
            dt = pd.to_datetime(df[col])
            df[f'{col}_year']       = dt.dt.year
            df[f'{col}_month']      = dt.dt.month
            df[f'{col}_day']        = dt.dt.day
            df[f'{col}_dayofweek']  = dt.dt.dayofweek
            df[f'{col}_is_weekend'] = (dt.dt.dayofweek >= 5).astype(int)
            print(f"[DATE] Derived features from: {col}")

    for col in log_columns:
        if col in df.columns:
            df[f'{col}_log1p'] = np.log1p(df[col].clip(lower=0))

    for col_a, col_b in ratio_pairs:
        if col_a in df.columns and col_b in df.columns:
            df[f'{col_a}_div_{col_b}'] = df[col_a] / df[col_b].replace(0, np.nan)

    for col_a, col_b in interaction_pairs:
        if col_a in df.columns and col_b in df.columns:
            df[f'{col_a}_x_{col_b}'] = df[col_a] * df[col_b]

    for col, n_bins in bin_columns.items():
        if col in df.columns:
            df[f'{col}_bin'] = pd.cut(df[col], bins=n_bins, labels=False)

    return df

@test
def test_output(df, *args) -> None:
    assert df is not None, 'Output is undefined'
