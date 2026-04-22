if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test

import pandas as pd

@transformer
def duplicate_cleaner(df: pd.DataFrame, *args, **kwargs) -> pd.DataFrame:
    """
    Duplicate & Empty Row Cleaner
    ─────────────────────────────
    CONFIG:
        subset        : list  = None    → columns to check for duplicates
        keep          : str   = 'first' → 'first' | 'last' | False
        drop_all_na   : bool  = True    → drop rows where ALL values are NaN
        strip_strings : bool  = True    → strip whitespace from string columns
        column_rename : dict  = {}      → {'old_name': 'new_name'}
        drop_columns  : list  = []      → columns to drop entirely
    """
    subset        = kwargs.get('subset', None)
    keep          = kwargs.get('keep', 'first')
    drop_all_na   = kwargs.get('drop_all_na', True)
    strip_strings = kwargs.get('strip_strings', True)
    column_rename = kwargs.get('column_rename', {})
    drop_columns  = kwargs.get('drop_columns', [])

    n_before = len(df)

    if drop_columns:
        df = df.drop(columns=[c for c in drop_columns if c in df.columns])

    if column_rename:
        df = df.rename(columns=column_rename)

    if strip_strings:
        str_cols = df.select_dtypes(include='object').columns
        df[str_cols] = df[str_cols].apply(lambda x: x.str.strip())

    if drop_all_na:
        df = df.dropna(how='all')

    df = df.drop_duplicates(subset=subset, keep=keep)
    df = df.reset_index(drop=True)

    print(f"[CLEAN] {n_before - len(df)} rows removed → {len(df)} rows remaining")
    return df

@test
def test_output(df, *args) -> None:
    assert df is not None, 'Output is undefined'
    assert df.duplicated().sum() == 0, 'Duplicate rows still exist!'