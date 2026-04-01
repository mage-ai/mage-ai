if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test

import pandas as pd

@transformer
def data_validator(df: pd.DataFrame, *args, **kwargs) -> pd.DataFrame:
    """
    Data Validator (Pipeline Entry Guard)
    ────────────────────────────────────────
    Place at the start of any pipeline to validate incoming data
    before it hits any transformation logic.

    CONFIG:
        required_columns : list  → column names that must exist
        expected_dtypes  : dict  → {'col': 'float64'} expected types
        min_rows         : int   = 1
        max_missing_pct  : float = 0.9  → global missing rate limit
        unique_columns   : list  → columns that must not have duplicates (e.g. ID)
    """
    required_columns = kwargs.get('required_columns', [])
    expected_dtypes  = kwargs.get('expected_dtypes', {})
    min_rows         = kwargs.get('min_rows', 1)
    max_missing_pct  = kwargs.get('max_missing_pct', 0.9)
    unique_columns   = kwargs.get('unique_columns', [])

    errors = []

    if len(df) < min_rows:
        errors.append(f"Too few rows: {len(df)} < {min_rows}")

    missing_cols = [c for c in required_columns if c not in df.columns]
    if missing_cols:
        errors.append(f"Missing required columns: {missing_cols}")

    for col, expected in expected_dtypes.items():
        if col in df.columns and str(df[col].dtype) != expected:
            errors.append(f"Column '{col}': expected {expected}, got {df[col].dtype}")

    global_missing = df.isnull().mean().mean()
    if global_missing > max_missing_pct:
        errors.append(f"Global missing rate too high: {global_missing:.1%} > {max_missing_pct:.1%}")

    for col in unique_columns:
        if col in df.columns and df[col].duplicated().any():
            errors.append(f"Column '{col}' has duplicates (expected unique)")

    if errors:
        raise ValueError("Schema validation failed:\n  - " + "\n  - ".join(errors))

    print(f"[VALIDATE] Schema OK — {len(df)} rows, {len(df.columns)} columns")
    return df

@test
def test_output(df, *args) -> None:
    assert df is not None, 'Output is undefined'
    assert len(df) > 0, 'DataFrame is empty'
