import json
import math
import re
from functools import reduce
from typing import Any, Dict, List


def dig(obj_arg, arr_or_string):
    if type(arr_or_string) is str:
        arr_or_string = arr_or_string.split('.')
    arr = list(map(str.strip, arr_or_string))

    def _build(obj, key):
        tup = re.split(r'\[(\d+)\]$', key)
        if len(tup) >= 2:
            key, index = filter(lambda x: x, tup)
            if key and index:
                return obj[key][int(index)]
            elif index:
                return obj[int(index)]
        elif obj:
            return obj.get(key)
        else:
            return obj
    return reduce(_build, arr, obj_arg)


def flatten(input_data):
    final_data = {}

    for k1, v1 in input_data.items():
        if type(v1) is dict:
            for k2, v2 in v1.items():
                if type(v2) is dict:
                    for k3, v3 in v2.items():
                        final_data[f'{k1}_{k2}_{k3}'] = v3
                else:
                    final_data[f'{k1}_{k2}'] = v2
        else:
            final_data[k1] = v1

    return final_data


def get_json_value(str_value, arr_or_string):
    if not str_value:
        return str_value
    try:
        obj_arg = json.loads(str_value)
    except Exception:
        return str_value
    return dig(obj_arg, arr_or_string)


def ignore_keys(d, keys):
    d_keys = d.keys()
    d2 = d.copy()
    for key in keys:
        if key in d_keys:
            d2.pop(key)
    return d2


def ignore_keys_with_blank_values(d: Dict, include_values: List[Any] = None) -> Dict:
    d2 = d.copy()
    for key, value in d.items():
        if not value and (not include_values or value not in include_values):
            d2.pop(key)
    return d2


def extract(d, keys, include_blank_values: bool = False):
    def _build(obj, key):
        val = None
        if key in d:
            val = d[key]
        if include_blank_values or val is not None:
            obj[key] = val
        return obj
    return reduce(_build, keys, {})


def extract_arrays(input_data):
    arr = []
    for _, v in input_data.items():
        if type(v) is list:
            arr.append(v)
    return arr


def group_by(func, arr):
    def _build(obj, item):
        val = func(item)
        if not obj.get(val):
            obj[val] = []
        obj[val].append(item)
        return obj
    return reduce(_build, arr, {})


def index_by(func, arr):
    obj = {}
    for item in arr:
        key = func(item)
        obj[key] = item
    return obj


def merge_dict(a: Dict, b: Dict) -> Dict:
    if a:
        c = a.copy()
    else:
        c = {}

    if not b:
        return c

    c.update(b)

    return c


def replace_dict_nan_value(d):
    def _replace_nan_value(v):
        if isinstance(v, float) and math.isnan(v):
            return None
        return v
    return {k: _replace_nan_value(v) for k, v in d.items()}


def get_safe_value(data: Dict, key: str, default_value):
    return data.get(key, default_value) if data else default_value


def set_value(obj: Dict, keys: List[str], value) -> Dict:
    if len(keys) >= 2:
        for idx in range(len(keys)):
            keys_init = keys[:idx]
            if len(keys_init) >= 1:
                set_value(obj, keys_init, dig(obj, keys_init) or {})

    results = dict(__obj_to_set_value=obj, __value=value)

    key = ''.join(f"['{key}']" for key in keys)
    expression = f'__obj_to_set_value{key} = __value'
    exec(expression, results)

    return results['__obj_to_set_value']
