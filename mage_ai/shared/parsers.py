from datetime import datetime
from json import JSONDecoder
import numpy as np

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
    if hasattr(obj, 'isoformat') and 'method' in type(obj.isoformat).__name__:
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

    return obj


def extract_json_objects(text, decoder=JSONDecoder()):
    """Find JSON objects in text, and yield the decoded JSON data

    Does not attempt to look for JSON arrays, text, or other JSON types outside
    of a parent JSON object.

    """
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
        return obj[:MAX_ITEMS_IN_SAMPLE_OUTPUT], sampled
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
