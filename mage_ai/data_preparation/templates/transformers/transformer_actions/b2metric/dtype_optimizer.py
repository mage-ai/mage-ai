if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test

import pandas as pd

@transformer
def dtype_optimizer(df: pd.DataFrame, *args, **kwargs) -> pd.DataFrame:
    """
    Dtype Optimizer
    ───────────────
    - int64   → downcasts to smallest valid int type
    - float64 → float32
    - object  → category (if cardinality < cat_threshold)
    - datetime strings → datetime64

    CONFIG:
        cat_threshold  : float = 0.5   → unique/total ratio below this → category
        parse_dates    : bool  = True  → parse date-like strings
        downcast_float : bool  = True
        downcast_int   : bool  = True
    """
    cat_threshold  = kwargs.get('cat_threshold', 0.5)
    parse_dates    = kwargs.get('parse_dates', True)
    downcast_float = kwargs.get('downcast_float', True)
    downcast_int   = kwargs.get('downcast_int', True)

    before_mem = df.memory_usage(deep=True).sum() / 1024**2

    for col in df.columns:
        col_type = df[col].dtype

        if pd.api.types.is_integer_dtype(col_type) and downcast_int:
            df[col] = pd.to_numeric(df[col], downcast='integer')

        elif pd.api.types.is_float_dtype(col_type) and downcast_float:
            df[col] = df[col].astype('float32')

        elif col_type == object:
            if parse_dates:
                try:
                    df[col] = pd.to_datetime(df[col])
                    continue
                except (ValueError, TypeError):
                    pass
            ratio = df[col].nunique() / len(df)
            if ratio < cat_threshold:
                df[col] = df[col].astype('category')

    after_mem = df.memory_usage(deep=True).sum() / 1024**2
    print(f"[MEM] {before_mem:.2f} MB → {after_mem:.2f} MB ({(1-after_mem/before_mem)*100:.1f}% reduction)")
    return df

@test
def test_output(df, *args) -> None:
    assert df is not None, 'Output is undefined'
