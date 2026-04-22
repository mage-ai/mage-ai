if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test

import pandas as pd
import numpy as np

@transformer
def outlier_handler(df: pd.DataFrame, *args, **kwargs) -> pd.DataFrame:
    """
    Outlier Handler
    ───────────────
    CONFIG:
        method   : 'iqr' | 'zscore'         (default: 'iqr')
        action   : 'clip' | 'drop' | 'flag' (default: 'clip')
        iqr_mult : float = 1.5
        z_thresh : float = 3.0
        columns  : list  = None → None applies to all numeric columns
    """
    method   = kwargs.get('method', 'iqr')
    action   = kwargs.get('action', 'clip')
    iqr_mult = kwargs.get('iqr_mult', 1.5)
    z_thresh = kwargs.get('z_thresh', 3.0)
    columns  = kwargs.get('columns', None)

    num_cols = columns or df.select_dtypes(include='number').columns.tolist()
    outlier_mask = pd.Series(False, index=df.index)

    for col in num_cols:
        s = df[col]
        if method == 'iqr':
            Q1, Q3 = s.quantile(0.25), s.quantile(0.75)
            IQR = Q3 - Q1
            lo, hi = Q1 - iqr_mult * IQR, Q3 + iqr_mult * IQR
        else:  # zscore
            lo = s.mean() - z_thresh * s.std()
            hi = s.mean() + z_thresh * s.std()

        mask = (s < lo) | (s > hi)
        outlier_mask |= mask

        if action == 'clip':
            df[col] = s.clip(lower=lo, upper=hi)
        elif action == 'flag':
            df[f'{col}_is_outlier'] = mask.astype(int)

    if action == 'drop':
        n_dropped = outlier_mask.sum()
        df = df[~outlier_mask]
        print(f"[DROP] {n_dropped} outlier rows dropped")

    print(f"[DONE] Outlier handling complete — method={method}, action={action}")
    return df

@test
def test_output(df, *args) -> None:
    assert df is not None, 'Output is undefined'
    assert len(df) > 0, 'DataFrame is empty after outlier removal!'