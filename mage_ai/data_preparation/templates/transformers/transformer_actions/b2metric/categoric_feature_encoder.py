if 'transformer' not in globals():
    from mage_ai.data_preparation.decorators import transformer
if 'test' not in globals():
    from mage_ai.data_preparation.decorators import test

import pandas as pd
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder

@transformer
def categoric_feature_encoder(df: pd.DataFrame, *args, **kwargs) -> pd.DataFrame:
    """
    Feature Encoder
    ───────────────
    CONFIG:
        ohe_columns         : list  → Columns to One-Hot encode
        label_columns       : list  → Columns to Label encode
        ordinal_columns     : dict  → {'col': ['low','mid','high']} ordered categories
        ohe_drop_first      : bool  = True → prevents multicollinearity
        max_ohe_cardinality : int   = 15   → skip OHE for high-cardinality columns
    """
    ohe_columns         = kwargs.get('ohe_columns', [])
    label_columns       = kwargs.get('label_columns', [])
    ordinal_columns     = kwargs.get('ordinal_columns', {})
    ohe_drop_first      = kwargs.get('ohe_drop_first', True)
    max_ohe_cardinality = kwargs.get('max_ohe_cardinality', 15)

    # Auto-assign if nothing specified
    if not ohe_columns and not label_columns:
        for col in df.select_dtypes(include=['object', 'category']).columns:
            if df[col].nunique() <= max_ohe_cardinality:
                ohe_columns.append(col)
            else:
                label_columns.append(col)

    if ohe_columns:
        df = pd.get_dummies(df, columns=ohe_columns, drop_first=ohe_drop_first)
        print(f"[OHE] Encoded: {ohe_columns}")

    le = LabelEncoder()
    for col in label_columns:
        df[col] = le.fit_transform(df[col].astype(str))
        print(f"[LABEL] Encoded: {col}")

    for col, order in ordinal_columns.items():
        oe = OrdinalEncoder(categories=[order])
        df[col] = oe.fit_transform(df[[col]])
        print(f"[ORDINAL] Encoded: {col} → {order}")

    return df

@test
def test_output(df, *args) -> None:
    assert df is not None, 'Output is undefined'
    cat_remaining = df.select_dtypes(include='object').columns.tolist()
    assert len(cat_remaining) == 0, f'Still has object columns: {cat_remaining}'
