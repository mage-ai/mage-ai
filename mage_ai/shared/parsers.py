import base64
import inspect
import io
import traceback
from collections.abc import Generator
from datetime import datetime
from enum import Enum
from json import JSONDecoder
from typing import Any, Dict, List, Optional, Union

import numpy as np
import pandas as pd
import polars as pl
import scipy

from mage_ai.data_preparation.models.variables.constants import VariableType
from mage_ai.orchestration.db.models.base import BaseModel
from mage_ai.shared.complex import is_model_sklearn, is_model_xgboost

INTS = (
    np.int16,
    np.int32,
    np.int64,
    np.int8,
    np.int_,
    np.intc,
    np.integer,
    np.intp,
    np.uint16,
    np.uint32,
    np.uint64,
    np.uint8,
)

MAX_ITEMS_IN_SAMPLE_OUTPUT = 20


def has_to_dict(obj) -> bool:
    return hasattr(obj, 'to_dict')


def encode_complex(obj):
    from mage_ai.shared.models import BaseDataClass

    if isinstance(obj, set):
        return list(obj)
    elif isinstance(obj, BaseModel):
        return obj.__class__.__name__
    elif obj.__class__.__name__ == 'BaseDataClass' or isinstance(obj, BaseDataClass):
        return obj.to_dict()
    elif isinstance(obj, Enum):
        return obj.value
    elif (
        isinstance(obj, datetime)
        or hasattr(obj, 'isoformat')
        and 'method' in type(obj.isoformat).__name__
    ):
        return obj.isoformat()
    elif isinstance(obj, INTS):
        return int(obj)
    elif isinstance(obj, (np.float_, np.float16, np.float32, np.float64, np.floating)):
        return float(obj)
    elif isinstance(obj, (np.complex_, np.complex64, np.complex128)):
        return {'real': obj.real, 'imag': obj.imag}
    elif isinstance(obj, (np.ndarray,)):
        # np.array is a function
        return obj.tolist()
    elif isinstance(obj, (np.bool_)):
        return bool(obj)
    elif isinstance(obj, (np.void, pd._libs.missing.NAType)):
        # Convert pandas._libs.missing.NAType to None
        return None
    elif isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient='records')
    elif isinstance(obj, pl.DataFrame):
        return obj.to_dicts()
    elif isinstance(obj, (pd.Index, pd.Series, pl.Series)):
        return obj.to_list()
    elif isinstance(obj, scipy.sparse.csr_matrix):
        return serialize_matrix(obj)
    elif is_model_sklearn(obj) or is_model_xgboost(obj) or inspect.isclass(obj):
        return object_to_uuid(obj)
    elif has_to_dict(obj):
        return obj.to_dict()
    elif isinstance(obj, Generator):
        return object_to_uuid(obj)
    elif isinstance(obj, Exception):
        # Serialize the exception
        return {
            'type': type(obj).__name__,
            'message': str(obj),
            'traceback': traceback.format_tb(obj.__traceback__),
        }

    return obj


def extract_json_objects(text, decoder=None):
    """Find JSON objects in text, and yield the decoded JSON data

    Does not attempt to look for JSON arrays, text, or other JSON types outside
    of a parent JSON object.

    """
    if decoder is None:
        decoder = JSONDecoder()
    pos = 0
    while True:
        match = text.find('{', pos)
        if match == -1:
            break
        try:
            result, index = decoder.raw_decode(text[match:])
            yield result
            pos = match + index
        except ValueError:
            pos = match + 1


def sample_output(obj):
    if isinstance(obj, list):
        sampled = len(obj) > MAX_ITEMS_IN_SAMPLE_OUTPUT
        sampled_list = []
        for item in obj[:MAX_ITEMS_IN_SAMPLE_OUTPUT]:
            item, item_sampled = sample_output(item)
            if item_sampled:
                sampled = True
            sampled_list.append(item)
        return sampled_list, sampled
    elif isinstance(obj, dict):
        sampled = False
        output = dict()
        for k, v in obj.items():
            v, v_sampled = sample_output(v)
            if v_sampled:
                sampled = True
            output[k] = v
        return output, sampled
    return obj, False


def serialize_matrix(csr_matrix: scipy.sparse._csr.csr_matrix) -> Dict:
    with io.BytesIO() as buffer:
        scipy.sparse.save_npz(buffer, csr_matrix)
        buffer.seek(0)
        data = base64.b64encode(buffer.read()).decode('ascii')

    return {'__type__': 'scipy.sparse.csr_matrix', '__data__': data}


def deserialize_matrix(json_dict: Dict) -> scipy.sparse._csr.csr_matrix:
    data = json_dict['__data__']
    data = base64.b64decode(data.encode('ascii'))

    with io.BytesIO(data) as buffer:
        buffer.seek(0)
        csr_matrix = scipy.sparse.load_npz(buffer)

    return csr_matrix


def convert_matrix_to_dataframe(csr_matrix: scipy.sparse.csr_matrix) -> pd.DataFrame:
    if isinstance(csr_matrix, scipy.sparse.csr_matrix):
        n_columns = csr_matrix.shape[1]
        return pd.DataFrame(csr_matrix.toarray(), columns=[str(i) for i in range(n_columns)])
    return csr_matrix


def polars_to_dict_split(df: pl.DataFrame) -> Dict:
    # Extract column names
    columns = df.columns

    # Extract rows as list of lists
    data = df.to_numpy().tolist()

    # Construct and return the dictionary
    return dict(columns=columns, data=data)


def object_to_hash(obj: Any) -> str:
    return hex(id(obj))


def object_uuid_parts(obj: Any) -> Dict[str, Union[bool, str, List[str]]]:
    if inspect.isclass(obj):
        obj_cls = obj
    else:
        obj_cls = obj.__class__

    return dict(
        module=obj_cls.__module__,
        name=obj_cls.__name__,
    )


def object_to_uuid(obj: Any, include_hash: bool = False) -> str:
    hash_uuid = None
    if include_hash:
        hash_uuid = object_to_hash(obj)

    parts = object_uuid_parts(obj)
    uuid = '.'.join([
        t
        for t in [
            str(parts['module']),
            str(parts['name']),
        ]
        if t
    ])

    if hash_uuid:
        return f'{uuid} {hash_uuid}'

    return uuid


def object_to_dict(
    obj: Any,
    include_hash: bool = True,
    include_uuid: bool = True,
    variable_type: Optional[VariableType] = None,
) -> Dict[str, Union[bool, str, List[str]]]:
    is_class = inspect.isclass(obj)

    data_dict = object_uuid_parts(obj)
    data_dict['type'] = 'class' if is_class else 'instance'
    data_dict['uuid'] = object_to_uuid(obj, include_hash=False)

    if include_uuid:
        data_dict['uuid'] = object_to_uuid(obj, include_hash=False)

    if include_hash and not is_class:
        data_dict['hash'] = object_to_hash(obj)

    if variable_type:
        data_dict['variable_type'] = variable_type.value

    return data_dict
