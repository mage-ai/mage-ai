import importlib
import inspect
import os
import traceback
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union
from warnings import warn

import numpy as np
import pandas as pd
import polars as pl
import simplejson
import yaml
from pandas import DataFrame
from sklearn.utils import estimator_html_repr

from mage_ai.data_cleaner.shared.utils import is_geo_dataframe, is_spark_dataframe
from mage_ai.data_preparation.models.project import Project
from mage_ai.data_preparation.models.project.constants import FeatureUUID
from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.settings.platform.constants import user_project_platform_activated
from mage_ai.shared.complex import is_model_sklearn, is_model_xgboost
from mage_ai.shared.hash import unflatten_dict
from mage_ai.shared.outputs import load_custom_object, save_custom_object
from mage_ai.shared.parsers import (
    convert_matrix_to_dataframe,
    encode_complex,
    object_to_dict,
    object_to_uuid,
)

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
                if df is None or df.empty:
                    continue
                df[column] = df[column].astype(column_type)
            except Exception:
                traceback.print_exc()
    return df


def cast_column_types_polars(df: pl.DataFrame, column_types: Dict):
    for column, column_type in column_types.items():
        if column_type in POLARS_CAST_TYPE_COLUMN_TYPES:
            try:
                if df is None or df.is_empty():
                    continue
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


# def dask_from_pandas(df: pd.DataFrame) -> dd:
#     ddf = dd.from_pandas(df, npartitions=1)
#     npartitions = 1 + ddf.memory_usage(deep=True).sum().compute() // MAX_PARTITION_BYTE_SIZE
#     ddf = ddf.repartition(npartitions=npartitions)

#     return ddf


# def apply_transform(ddf: dd, apply_function) -> dd:
#     res = ddf.apply(apply_function, axis=1, meta=ddf)
#     return res.compute()


def apply_transform_pandas(df: pd.DataFrame, apply_function) -> pd.DataFrame:
    return df.apply(apply_function, axis=1)


def apply_transform_polars(df: pl.DataFrame, apply_function) -> pl.DataFrame:
    return df.apply(apply_function, axis=1)


def should_serialize_pandas(column_types: Dict) -> bool:
    if not column_types:
        return False
    for _, column_type in column_types.items():
        if (
            column_type in JSON_SERIALIZABLE_COLUMN_TYPES
            or column_type in STRING_SERIALIZABLE_COLUMN_TYPES
        ):
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


def is_dataframe_or_series(data: Any) -> bool:
    return isinstance(data, (pd.DataFrame, pd.Series, pl.DataFrame, pl.Series))


def infer_variable_type(
    data: Any,
    repo_path: Optional[str] = None,
    variable_type: Optional[Any] = None,
) -> Tuple[Optional[Any], Optional[bool]]:
    from scipy.sparse import csr_matrix

    basic_iterable = is_basic_iterable(data)
    variable_type_use = variable_type

    if isinstance(data, pl.DataFrame) or (
        basic_iterable and len(data) >= 1 and all(isinstance(d, pl.DataFrame) for d in data)
    ):
        # Need to import here to mock in unit tests.
        from mage_ai.settings.server import MEMORY_MANAGER_POLARS_V2, MEMORY_MANAGER_V2

        if (MEMORY_MANAGER_V2 and MEMORY_MANAGER_POLARS_V2) or Project(
            repo_path=repo_path
        ).is_feature_enabled(FeatureUUID.POLARS):
            variable_type_use = VariableType.POLARS_DATAFRAME
        # If Polars is not enabled, we will fall back to the original logic in variable_manager
        # before this change:
        # if type(data) is pd.DataFrame:
        #     variable_type = VariableType.DATAFRAME
        # elif is_spark_dataframe(data):
        #     variable_type = VariableType.SPARK_DATAFRAME
        # elif is_geo_dataframe(data):
        #     variable_type = VariableType.GEO_DATAFRAME
        # variable = Variable(
        #     clean_name(variable_uuid),
        #     self.pipeline_path(pipeline_uuid),
        #     block_uuid,
        #     partition=partition,
        #     storage=self.storage,
        #     variable_type=variable_type,
        #     clean_block_uuid=clean_block_uuid,
        # )
    elif isinstance(data, pd.DataFrame):
        variable_type_use = VariableType.DATAFRAME
    elif is_spark_dataframe(data):
        variable_type_use = VariableType.SPARK_DATAFRAME
    elif is_geo_dataframe(data):
        variable_type_use = VariableType.GEO_DATAFRAME
    elif isinstance(data, csr_matrix) or (
        basic_iterable and len(data) >= 1 and all(isinstance(d, csr_matrix) for d in data)
    ):
        variable_type_use = VariableType.MATRIX_SPARSE
    elif isinstance(data, pd.Series) or (
        basic_iterable and len(data) >= 1 and all(isinstance(d, pd.Series) for d in data)
    ):
        variable_type_use = VariableType.SERIES_PANDAS
    elif isinstance(data, pl.Series) or (
        basic_iterable and len(data) >= 1 and all(isinstance(d, pl.Series) for d in data)
    ):
        variable_type_use = VariableType.SERIES_POLARS
    elif is_model_sklearn(data) or (
        basic_iterable and len(data) >= 1 and all(is_model_sklearn(d) for d in data)
    ):
        variable_type_use = VariableType.MODEL_SKLEARN
    elif is_model_xgboost(data) or (
        basic_iterable and len(data) >= 1 and all(is_model_xgboost(d) for d in data)
    ):
        variable_type_use = VariableType.MODEL_XGBOOST
    elif is_list_complex(data) or (
        basic_iterable
        and len(data) >= 1
        and len(data) <= 100  # If there are over 100 complex items in this list, we won’t handle.
        and all(is_list_complex(d) for d in data)
    ):
        variable_type_use = VariableType.LIST_COMPLEX
    elif is_dictionary_complex(data) or (
        basic_iterable and len(data) >= 1 and all(is_dictionary_complex(d) for d in data)
    ):
        variable_type_use = VariableType.DICTIONARY_COMPLEX
    elif is_custom_object(data) or (
        basic_iterable and len(data) >= 1 and all(is_custom_object(d) for d in data)
    ):
        variable_type_use = VariableType.CUSTOM_OBJECT
    elif basic_iterable:
        variable_type_use = VariableType.ITERABLE

    return variable_type_use, basic_iterable


def is_dictionary_complex(data: Any) -> bool:
    return isinstance(data, dict) and any(is_user_defined_complex(v) for v in data.values())


def is_list_complex(data: Any) -> bool:
    return isinstance(data, (list, set, tuple)) and any(is_user_defined_complex(v) for v in data)


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
    combine_values_and_column_types: Optional[bool] = False,
    path: Optional[List[str]] = None,
    save_path: Optional[str] = None,
) -> Tuple[Any, Dict]:
    if column_types is None:
        column_types = {}
    if path is None:
        path = []

    def update_column_types(
        value: Any,
        key_path: str,
        full_save_path: Optional[str] = None,
        serialized_value: Optional[Union[bool, int, float, str, List, Dict, DataFrame]] = None,
        variable_type: Optional[VariableType] = None,
        combine_values_and_column_types=combine_values_and_column_types,
    ):
        """
        Updates column_types dictionary based on the value's type and structure.
        Optionally includes the serialized value if combine_values_and_column_types is True.
        """
        type_info = None

        if variable_type in [
            VariableType.CUSTOM_OBJECT,
            VariableType.MODEL_SKLEARN,
            VariableType.MODEL_XGBOOST,
        ]:
            type_info = object_to_dict(value, variable_type=variable_type)
            if full_save_path:
                type_info['path'] = full_save_path
        else:
            type_info = object_to_dict(value, variable_type=variable_type)

        if combine_values_and_column_types:
            type_info['value'] = serialized_value

        column_types[key_path] = type_info

    def serialize(
        value: Any,
        current_path: Optional[List[str]] = None,
        combine_values_and_column_types=combine_values_and_column_types,
        save_path=save_path,
    ) -> Any:
        """Recursively serializes data while updating column types accordingly."""
        serialized_value = None
        current_path = current_path or []

        full_save_path = os.path.join(save_path, *current_path) if save_path else None
        key_path = '.'.join(current_path)
        variable_type, _ = infer_variable_type(value)

        if isinstance(value, dict):
            serialized_value = {k: serialize(v, current_path + [k]) for k, v in value.items()}
        elif is_basic_iterable(value):
            value_iter = list(value) if isinstance(value, set) else value
            serialized_value = [
                serialize(
                    v,
                    current_path + [str(i)],
                )
                for i, v in enumerate(value_iter)
            ]
        else:
            if variable_type in [
                VariableType.CUSTOM_OBJECT,
                VariableType.MODEL_SKLEARN,
                VariableType.MODEL_XGBOOST,
            ]:
                if full_save_path:
                    os.makedirs(os.path.dirname(full_save_path), exist_ok=True)
                    _, full_save_path = save_custom_object(value, full_save_path, variable_type)

            serialized_value, _ = prepare_data_for_output(value)

        if current_path:
            update_column_types(
                value,
                key_path,
                variable_type=variable_type,
                full_save_path=full_save_path,
                serialized_value=serialized_value,
            )

        return serialized_value

    # Start the serialization process from the root.
    serialized_data = serialize(data, path)

    return serialized_data, column_types


def deserialize_custom_complex_objects(
    value: Any,
    path: str,
    variable_type: VariableType,
):
    data = load_custom_object(os.path.dirname(path), variable_type)
    if data is not None:
        return data
    return value


def construct_value(type_info: Dict[str, Union[str, Optional[str]]], value: Any) -> Any:
    """
    Constructs a Python object from value based on type information.
    """
    type_name = type_info['name']

    if 'path' in type_info and 'variable_type' in type_info:
        return deserialize_custom_complex_objects(
            value,
            str(type_info['path']),
            VariableType(type_info['variable_type']),
        )

    if isinstance(value, pd.DataFrame):
        return pd.DataFrame(value)
    elif isinstance(value, pd.Series):
        return pd.Series(value)
    elif isinstance(value, pl.DataFrame):
        return pl.DataFrame(value)
    elif isinstance(value, pl.Series):
        return pl.Series(value)
    elif 'Timestamp' == type_name:
        return pd.Timestamp(value)
    elif 'datetime' == type_name:
        return datetime.fromisoformat(value)
    elif 'ndarray' == type_name:
        return np.array(value)
    elif 'DataFrame' == type_name and not isinstance(value, str):
        return pd.DataFrame(value)
    elif 'Series' == type_name and not isinstance(value, str):
        return pd.Series(value)
    elif 'tuple' == type_name:
        return tuple(value)
    elif 'set' == type_name:
        return set(value)
    elif 'int' == type_name:
        return int(value)
    elif 'float' == type_name:
        return float(value)
    elif 'str' == type_name:
        return str(value)
    elif 'bool' == type_name:
        return bool(value)
    elif not isinstance(value, str):
        # For simplicity, assuming direct values don't need complex deserialization
        module_name = type_info['module']
        class_name = type_info['name']
        module = importlib.import_module(str(module_name))
        class_ = getattr(module, str(class_name))
        return class_(value)

    return value


def deserialize_element(value: Any, path: str, column_types: Dict[str, Dict]):
    """
    Recursively deserializes a nested structure based on its column type definition.
    """
    if path in column_types:
        type_info = column_types[path]

        # Handle complex nested structures
        if type_info['name'] in ['list', 'tuple', 'set']:
            # Recursively construct elements of the list, tuple, or set
            constructed_elements = [
                deserialize_element(
                    v,
                    f'{path}.{i}',
                    column_types,
                )
                for i, v in enumerate(value)
            ]

            if type_info['name'] == 'tuple':
                return tuple(constructed_elements)
            elif type_info['name'] == 'set':
                return set(constructed_elements)

            # list
            return constructed_elements

        return construct_value(type_info, value)

    # Default case for values without specific type info (assumed to be simple types)
    return value


def unflatten_and_deserialize(flattened_data: Dict, column_types: Dict[str, Dict]) -> Dict:
    staging_data = {}

    for key, value in flattened_data.items():
        deserialized_value = deserialize_element(value, key, column_types)
        staging_data[key] = deserialized_value

    return unflatten_dict(staging_data)


def deserialize_complex(data: Any, column_types: Dict[str, Dict], unflatten: bool = False) -> Dict:
    """
    Deserialize serialized data (from JSON) back to its original structure and types.
    """
    if unflatten and isinstance(data, dict):
        return unflatten_and_deserialize(data, column_types)

    if isinstance(data, dict):
        return {key: deserialize_element(value, key, column_types) for key, value in data.items()}
    elif isinstance(data, list):
        # Assuming top-level list doesn't have a path, use an empty string as a placeholder path
        return [
            deserialize_element(
                item,
                str(index),
                column_types,
            )
            for index, item in enumerate(data)
        ]
    else:
        # Top-level simple types
        return deserialize_element(data, '', column_types)


def is_custom_object(obj: Any) -> bool:
    if not is_user_defined_complex(obj):
        return False

    for base_class in inspect.getmro(obj.__class__):
        if base_class.__module__ not in ('__builtin__', 'builtins'):
            return True
    return False


def prepare_data_for_output(
    data: Any,
    single_item_only: bool = False,
) -> Tuple[
    Union[DataFrame, Dict, str, List[Union[DataFrame, Dict, str]]],
    Optional[VariableType],
]:
    variable_type, basic_iterable = infer_variable_type(data)

    if single_item_only and basic_iterable and len(data) >= 1:
        data = data[0]

    if VariableType.SERIES_PANDAS == variable_type:
        if basic_iterable:
            data = DataFrame(data).T
        else:
            data = data.to_frame()
    elif VariableType.MATRIX_SPARSE == variable_type:
        if basic_iterable:
            data = convert_matrix_to_dataframe(data[0])
        else:
            data = convert_matrix_to_dataframe(data)
    elif VariableType.MODEL_SKLEARN == variable_type:
        if basic_iterable:
            data = [estimator_html_repr(d) for d in data]
        else:
            data = estimator_html_repr(data)
    elif VariableType.MODEL_XGBOOST == variable_type:
        if basic_iterable:
            data = [object_to_uuid(d) for d in data]
        else:
            data = object_to_uuid(data)
    elif VariableType.CUSTOM_OBJECT == variable_type:
        if basic_iterable:
            data = [object_to_uuid(d) for d in data]
        else:
            data = object_to_uuid(data)
    elif VariableType.DICTIONARY_COMPLEX == variable_type:
        if basic_iterable:
            data = [serialize_complex(d)[0] for d in data]
        else:
            data = serialize_complex(data)[0]
    elif VariableType.LIST_COMPLEX == variable_type:
        if basic_iterable:
            data = [serialize_complex(d)[0] for d in data]
        else:
            data = serialize_complex(data)[0]
    else:
        variable_type = None

    return data, variable_type


def warn_for_repo_path(repo_path: Optional[str]) -> None:
    """
    Warn if repo_path is not provided when using project platform and user
    authentication is enabled.
    """
    if repo_path is None and user_project_platform_activated():
        try:
            func_name = inspect.stack()[1][3]
            message = f'repo_path argument in {func_name} must be provided.'
        except Exception:
            message = 'repo_path argument must be provided.'
        warn(
            f'{message} Some functionalities may not work as expected',
            SyntaxWarning,
            stacklevel=2,
        )
