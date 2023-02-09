from mage_integrations.utils.parsers import encode_complex
from typing import Dict
import dask.dataframe as dd
import simplejson

MAX_PARTITION_BYTE_SIZE = 100 * 1024 * 1024
JSON_SERIALIZABLE_COLUMN_TYPES = [
    'Timestamp',
    dict.__name__,
    list.__name__,
]


def serialize_columns(row: 'pd.Series', column_types: Dict) -> 'pd.Series':
    for column, column_type in column_types.items():
        if column_type not in JSON_SERIALIZABLE_COLUMN_TYPES:
            continue

        val = row[column]
        if val:
            row[column] = simplejson.dumps(
                val,
                default=encode_complex,
                ignore_nan=True,
                use_decimal=True,
            )

    return row


def deserialize_columns(row: 'pd.Series', column_types: Dict) -> 'pd.Series':
    for column, column_type in column_types.items():
        if column_type not in JSON_SERIALIZABLE_COLUMN_TYPES:
            continue

        val = row[column]
        if val:
            row[column] = simplejson.loads(val)

    return row


def dask_from_pandas(df: 'pd.DataFrame') -> 'dask.dataframe':
    ddf = dd.from_pandas(df, npartitions=1)
    npartitions = 1 + ddf.memory_usage(deep=True).sum().compute() // MAX_PARTITION_BYTE_SIZE
    ddf = ddf.repartition(npartitions=npartitions)

    return ddf


def apply_transform(ddf: 'dask.dataframe', apply_function) -> 'dask.dataframe':
    res = ddf.apply(apply_function, axis=1, meta=ddf)
    return res.compute()
