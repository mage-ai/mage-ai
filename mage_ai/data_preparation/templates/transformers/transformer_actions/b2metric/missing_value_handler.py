if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test

import pandas as pd
from sklearn.impute import SimpleImputer

@transformer
def missing_value_handler(df: pd.DataFrame, *args, **kwargs) -> pd.DataFrame:
    """
    Missing Value Handler
    ─────────────────────
    CONFIG (kwargs):
        drop_threshold   : float  = 0.5   → Drop columns where missing > X%
        numeric_strategy : str    = 'mean' → mean | median | most_frequent | constant
        numeric_fill     : any    = 0      → Used when strategy='constant'
        cat_strategy     : str    = 'most_frequent'
        cat_fill         : str    = 'UNKNOWN'
        drop_rows_thresh : float  = None   → Drop rows where missing > X% of values
    """
    drop_threshold   = kwargs.get('drop_threshold', 0.5)
    numeric_strategy = kwargs.get('numeric_strategy', 'mean')
    numeric_fill     = kwargs.get('numeric_fill', 0)
    cat_strategy     = kwargs.get('cat_strategy', 'most_frequent')
    cat_fill         = kwargs.get('cat_fill', 'UNKNOWN')
    drop_rows_thresh = kwargs.get('drop_rows_thresh', None)

    # ── 1. Drop high-missing COLUMNS
    missing_ratio = df.isnull().mean()
    cols_to_drop  = missing_ratio[missing_ratio > drop_threshold].index.tolist()
    if cols_to_drop:
        print(f"[DROP COLS] {cols_to_drop} → missing > {drop_threshold:.0%}")
        df = df.drop(columns=cols_to_drop)

    # ── 2. Drop high-missing ROWS
    if drop_rows_thresh is not None:
        row_missing = df.isnull().mean(axis=1)
        dropped_rows = (row_missing > drop_rows_thresh).sum()
        df = df[row_missing <= drop_rows_thresh]
        print(f"[DROP ROWS] {dropped_rows} rows dropped (missing > {drop_rows_thresh:.0%})")

    # ── 3. Numeric imputation
    num_cols = df.select_dtypes(include='number').columns.tolist()
    if num_cols:
        fill_val = numeric_fill if numeric_strategy == 'constant' else None
        imp = SimpleImputer(strategy=numeric_strategy, fill_value=fill_val)
        df[num_cols] = imp.fit_transform(df[num_cols])

    # ── 4. Categorical imputation
    cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    if cat_cols:
        fill_val = cat_fill if cat_strategy == 'constant' else None
        imp = SimpleImputer(strategy=cat_strategy, fill_value=fill_val)
        df[cat_cols] = imp.fit_transform(df[cat_cols])

    print(f"[DONE] Remaining nulls: {df.isnull().sum().sum()}")
    return df

@test
def test_output(df, *args) -> None:
    assert df is not None, 'Output is undefined'
    assert df.isnull().sum().sum() == 0, 'Still has missing values!'
