import json
import numpy as np


def encode_complex(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()

    return obj


class NpEncoder(json.JSONEncoder):
    def __init__(
        self,
        **kwargs,
    ):
        data = {}
        for key in [
            'allow_nan'
            'bigint_as_string'
            'check_circular'
            'default'
            'ensure_ascii'
            'for_json'
            'ignore_nan'
            'indent'
            'int_as_string_bitcount'
            'item_sort_key'
            'iterable_as_array'
            'namedtuple_as_object'
            'separators'
            'skipkeys'
            'sort_keys'
            'tuple_as_array'
            'use_decimal'
        ]:
            if kwargs.get(key):
                data[key] = kwargs[key]
        super().__init__(**data)

    def default(self, obj):
        return encode_complex(obj)
