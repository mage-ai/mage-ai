import traceback
from typing import Any, Dict

import dask.dataframe as dd
import numpy
import pandas as pd
import simplejson
import yaml

from mage_ai.shared.parsers import encode_complex

MAX_PARTITION_BYTE_SIZE = 100 * 1024 * 1024
JSON_SERIALIZABLE_COLUMN_TYPES = set([
    dict.__name__,
    list.__name__,
])
STRING_SERIALIZABLE_COLUMN_TYPES = set([
    'ObjectId',
])

CAST_TYPE_COLUMN_TYPES = set([
    'Int64',
    'int64',
    'float64',
])


def serialize_columns(row: pd.Series, column_types: Dict) -> pd.Series:
    for column, column_type in column_types.items():
        if column_type in JSON_SERIALIZABLE_COLUMN_TYPES:
            val = row[column]
            if val is not None:
                row[column] = simplejson.dumps(
                    val,
                    default=encode_complex,
                    ignore_nan=True,
                    use_decimal=True,
                )
        elif column_type in STRING_SERIALIZABLE_COLUMN_TYPES:
            val = row[column]
            if val is not None:
                row[column] = str(val)

    return row


def cast_column_types(df: pd.DataFrame, column_types: Dict):
    for column, column_type in column_types.items():
        if column_type in CAST_TYPE_COLUMN_TYPES:
            try:
                df[column] = df[column].astype(column_type)
            except Exception:
                traceback.print_exc()
    return df


def deserialize_columns(row: pd.Series, column_types: Dict) -> pd.Series:
    for column, column_type in column_types.items():
        if column_type not in JSON_SERIALIZABLE_COLUMN_TYPES:
            continue

        val = row[column]
        if val is not None and type(val) is str:
            row[column] = simplejson.loads(val)
        elif val is not None and type(val) is numpy.ndarray and column_type == list.__name__:
            row[column] = list(val)

    return row


def dask_from_pandas(df: pd.DataFrame) -> dd:
    ddf = dd.from_pandas(df, npartitions=1)
    npartitions = 1 + ddf.memory_usage(deep=True).sum().compute() // MAX_PARTITION_BYTE_SIZE
    ddf = ddf.repartition(npartitions=npartitions)

    return ddf


def apply_transform(ddf: dd, apply_function) -> dd:
    res = ddf.apply(apply_function, axis=1, meta=ddf)
    return res.compute()


def apply_transform_pandas(df: pd.DataFrame, apply_function) -> pd.DataFrame:
    return df.apply(apply_function, axis=1)


def should_serialize_pandas(column_types: Dict) -> bool:
    if not column_types:
        return False
    for _, column_type in column_types.items():
        if column_type in JSON_SERIALIZABLE_COLUMN_TYPES or \
                column_type in STRING_SERIALIZABLE_COLUMN_TYPES:
            return True
    return False


def should_deserialize_pandas(column_types: Dict) -> bool:
    if not column_types:
        return False
    for _, column_type in column_types.items():
        if column_type in JSON_SERIALIZABLE_COLUMN_TYPES:
            return True
    return False


def is_yaml_serializable(key: str, value: Any) -> bool:
    try:
        s = yaml.dump(dict(key=value))
        yaml.safe_load(s)
        return True
    except Exception:
        return False
