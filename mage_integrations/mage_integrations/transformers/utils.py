from mage_integrations.sources.constants import COLUMN_TYPE_NUMBER, COLUMN_TYPE_STRING, COLUMN_TYPES
from pandas.api.types import infer_dtype
from typing import Dict
import pandas as pd


INVALID_DATA_TYPES = [
    'empty',
    'mixed',
]


def write_parquet_file(file_path: str, df: pd.DataFrame) -> None:
    df_output = df.copy()
    # Clean up data types since parquet doesn't support mixed data types
    for c in df_output.columns:
        series_non_null = df_output[c].dropna()
        if len(series_non_null) > 0:
            coltype = type(series_non_null.iloc[0])
            try:
                df_output[c] = series_non_null.astype(coltype)
            except Exception:
                # Fall back to convert to string
                df_output[c] = series_non_null.astype(str)
    df_output.to_parquet(file_path)


def infer_dtypes(df: pd.DataFrame) -> Dict[str, str]:
    return {column: infer_dtype(df[column], skipna=True) for column in df.columns}


def convert_data_type(v) -> str:
    if v in INVALID_DATA_TYPES:
        return COLUMN_TYPE_STRING
    elif 'floating' == v:
        return COLUMN_TYPE_NUMBER
    elif v not in COLUMN_TYPES:
        return COLUMN_TYPE_STRING
    return v
