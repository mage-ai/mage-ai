import inspect
import traceback
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import dask.dataframe as dd
import numpy as np
import pandas as pd
import polars as pl
import simplejson
import yaml

from mage_ai.data_cleaner.shared.utils import is_geo_dataframe, is_spark_dataframe
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.shared.parsers import encode_complex

MAX_PARTITION_BYTE_SIZE = 100 * 1024 * 1024
JSON_SERIALIZABLE_COLUMN_TYPES = {
    dict.__name__,
    list.__name__,
}
STRING_SERIALIZABLE_COLUMN_TYPES = {
    'ObjectId',
}

AMBIGUOUS_COLUMN_TYPES = {
    'mixed-integer',
    'complex',
    'unknown-array',
}

CAST_TYPE_COLUMN_TYPES = {
    'Int64',
    'int64',
    'float64',
}

POLARS_CAST_TYPE_COLUMN_TYPES = {
    'Float64': pl.Float64,
    'Int64': pl.Int64,
}


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


def cast_column_types_polars(df: pl.DataFrame, column_types: Dict):
    for column, column_type in column_types.items():
        if column_type in POLARS_CAST_TYPE_COLUMN_TYPES:
            try:
                df = df.cast({column: POLARS_CAST_TYPE_COLUMN_TYPES.get(column_type)})
            except Exception:
                traceback.print_exc()
    return df


def deserialize_columns(row: pd.Series, column_types: Dict) -> pd.Series:
    for column, column_type in column_types.items():
        if column_type not in JSON_SERIALIZABLE_COLUMN_TYPES:
            continue

        val = row[column]
        if val is not None and isinstance(val, str):
            row[column] = simplejson.loads(val)
        elif val is not None and isinstance(val, np.ndarray) and column_type == list.__name__:
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


def apply_transform_polars(df: pl.DataFrame, apply_function) -> pl.DataFrame:
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
        s = yaml.dump({key: value})
        yaml.safe_load(s)
        return True
    except Exception:
        return False


def is_basic_iterable(data: Any) -> bool:
    return isinstance(data, (list, set, tuple))


def is_model_sklearn(data: Any) -> bool:
    pairs = [(str(pc.__module__), str(pc.__name__)) for pc in inspect.getmro(data.__class__)]
    return any(
        module_name.startswith('sklearn.base') and class_name.startswith('BaseEstimator')
        for module_name, class_name in pairs
    )


def is_model_xgboost(data: Any) -> bool:
    pairs = [(str(pc.__module__), str(pc.__name__)) for pc in inspect.getmro(data.__class__)]
    return any(
        module_name.startswith('xgboost.core') and class_name.startswith('Booster')
        for module_name, class_name in pairs
    )


def infer_variable_type(
    data: Any,
    repo_path: Optional[str] = None,
    variable_type: Optional[Any] = None,
) -> Tuple[Optional[Any], Optional[bool]]:
    from scipy.sparse import csr_matrix

    from mage_ai.data_preparation.models.variable import VariableType

    basic_iterable = is_basic_iterable(data)
    variable_type_use = variable_type

    if isinstance(data, pl.DataFrame) or (
        basic_iterable and
        len(data) >= 1 and
        all(isinstance(d, pl.DataFrame) for d in data)
    ):
        if Project(repo_path=repo_path).is_feature_enabled(FeatureUUID.POLARS):
            variable_type_use = VariableType.POLARS_DATAFRAME
    if isinstance(data, pd.DataFrame):
        variable_type_use = VariableType.DATAFRAME
    elif is_spark_dataframe(data):
        variable_type_use = VariableType.SPARK_DATAFRAME
    elif is_geo_dataframe(data):
        variable_type_use = VariableType.GEO_DATAFRAME
    elif isinstance(data, csr_matrix) or (
        basic_iterable and
        len(data) >= 1 and
        all(isinstance(d, csr_matrix) for d in data)
    ):
        variable_type_use = VariableType.MATRIX_SPARSE
    elif isinstance(data, pd.Series) or (
        basic_iterable and
        len(data) >= 1 and
        all(isinstance(d, pd.Series) for d in data)
    ):
        variable_type_use = VariableType.SERIES_PANDAS
    elif is_model_sklearn(data) or (
        basic_iterable and
        len(data) >= 1 and
        all(is_model_sklearn(d) for d in data)
    ):
        variable_type_use = VariableType.MODEL_SKLEARN
    elif is_model_xgboost(data) or (
        basic_iterable and
        len(data) >= 1 and
        all(is_model_xgboost(d) for d in data)
    ):
        variable_type_use = VariableType.MODEL_XGBOOST
    elif variable_type_use is None:
        if isinstance(data, dict) and any(is_user_defined_complex(v) for v in data.values()):
            variable_type_use = VariableType.DICTIONARY_COMPLEX

    return variable_type_use, basic_iterable


def is_primitive(value: Any) -> bool:
    built_in_types = (int, float, str, bool)
    return isinstance(value, built_in_types)


def is_user_defined_complex(value: Any) -> bool:
    if is_primitive(value):
        return False

    # Consider only user-defined or less common complex types
    built_in_types = (list, dict, tuple, set, type(None))

    return not isinstance(value, built_in_types)


def serialize_complex(
    data: Any,
    column_types: Optional[Dict] = None,
    path: Optional[List[str]] = None
) -> Any:
    from mage_ai.data_preparation.models.variable import VariableType

    if column_types is None:
        column_types = {}
    if path is None:
        path = []

    def update_column_types(value: Any, current_path: List[str]):
        """Updates column_types dictionary based on the value's type and structure."""
        if not current_path:
            return

        key_path = '.'.join(current_path)
        if infer_variable_type(value)[0] in [VariableType.MODEL_SKLEARN,
                                             VariableType.MODEL_XGBOOST]:
            column_types[key_path] = {
                "module": "builtins",
                "name": "str",  # Serializing models as strings
            }
        else:
            class_info = {
                "module": value.__class__.__module__,
                "name": value.__class__.__name__,
            }

            # For lists, we assume uniform type
            if is_basic_iterable(value) and len(value) > 0:
                subtypes = {}
                value_iter = list(value) if isinstance(value, set) else value
                for i, val in enumerate(value_iter[:1]):  # Check the first item for simplicity
                    subtypes[str(i)] = {
                        "module": val.__class__.__module__,
                        "name": val.__class__.__name__,
                    }
                class_info['subtypes'] = subtypes

            column_types[key_path] = class_info

    def serialize(value: Any, current_path: List[str] = []) -> Any:
        """Recursively serializes data while updating column types accordingly."""
        update_column_types(value, current_path)

        if isinstance(value, dict):
            return {k: serialize(v, current_path + [k]) for k, v in value.items()}
        elif is_basic_iterable(value):
            value_iter = list(value) if isinstance(value, set) else value
            return [serialize(v, current_path + [str(i)]) for i, v in enumerate(value_iter)]
        elif infer_variable_type(value)[0] in [
            VariableType.MODEL_SKLEARN,
            VariableType.MODEL_XGBOOST,
        ]:
            return str(value)
        else:
            return encode_complex(value)

    # Start the serialization process from the root.
    serialized_data = serialize(data, path)
    return serialized_data, column_types


def construct_value(type_info, value):
    """
    Constructs a Python object from value based on type information.
    """
    if type_info['name'] == 'Timestamp':
        return pd.Timestamp(value)
    elif type_info['name'] == 'datetime':
        return datetime.fromisoformat(value)
    elif type_info['name'] == 'ndarray':
        return np.array(value)
    elif type_info['name'] == 'DataFrame':
        return pd.DataFrame(value)
    elif type_info['name'] == 'Series':
        return pd.Series(value)
    elif type_info['name'] == 'tuple':
        return tuple(value)
    elif type_info['name'] == 'set':
        return set(value)
    else:
        return value


def deserialize_element(value, path, column_types):
    """
    Recursively deserializes a nested structure based on its column type definition.
    """
    if path in column_types:
        type_info = column_types[path]
        if 'subtypes' in type_info:
            # Handle complex nested structures
            if type_info['name'] in ['list', 'tuple', 'set']:
                # Recursively construct elements of the list, tuple, or set
                constructed_elements = [deserialize_element(v, f"{path}.{i}", column_types)
                                        for i, v in enumerate(value)]
                if type_info['name'] == 'tuple':
                    return tuple(constructed_elements)
                elif type_info['name'] == 'set':
                    return set(constructed_elements)
                else:  # list
                    return constructed_elements
            else:
                return construct_value(type_info, value)
        else:
            return construct_value(type_info, value)
    else:
        # Default case for values without specific type info (assumed to be simple types)
        return value


def deserialize_complex(data, column_types):
    """
    Deserialize serialized data (from JSON) back to its original structure and types.
    """
    if isinstance(data, dict):
        return {key: deserialize_element(value, key, column_types) for key, value in data.items()}
    elif isinstance(data, list):
        # Assuming top-level list doesn't have a path, use an empty string as a placeholder path
        return [deserialize_element(item, str(index), column_types)
                for index, item in enumerate(data)]
    else:
        # Top-level simple types
        return deserialize_element(data, '', column_types)
