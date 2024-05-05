import base64
import io
from datetime import datetime
from enum import Enum
from json import JSONDecoder
from typing import Dict

import numpy as np
import pandas as pd
import scipy

from mage_ai.orchestration.db.models.base import BaseModel

INTS = (
    np.int16,
    np.int32,
    np.int64,
    np.int8,
    np.int_,
    np.intc,
    np.intp,
    np.uint16,
    np.uint32,
    np.uint64,
    np.uint8,
)

MAX_ITEMS_IN_SAMPLE_OUTPUT = 20


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
    elif hasattr(obj, 'isoformat') and 'method' in type(obj.isoformat).__name__:
        return obj.isoformat()
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, INTS):
        return int(obj)
    elif isinstance(obj, (np.float_, np.float16, np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, (np.complex_, np.complex64, np.complex128)):
        return {'real': obj.real, 'imag': obj.imag}
    elif isinstance(obj, (np.ndarray,)):
        return obj.tolist()
    elif isinstance(obj, (np.bool_)):
        return bool(obj)
    elif isinstance(obj, (np.void)):
        return None
    elif isinstance(obj, pd.DataFrame):
        return obj.to_dict(orient='records')
    elif isinstance(obj, pd.Series):
        return obj.to_list()
    # Convert pandas._libs.missing.NAType to None
    elif isinstance(obj, pd._libs.missing.NAType):
        return None
    elif isinstance(obj, scipy.sparse.csr_matrix):
        return serialize_matrix(obj)

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

    return {
        '__type__': 'scipy.sparse.csr_matrix',
        '__data__': data
    }


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
        return pd.DataFrame(csr_matrix.toarray(), columns=[f'col_{i}' for i in range(n_columns)])
    return csr_matrix
