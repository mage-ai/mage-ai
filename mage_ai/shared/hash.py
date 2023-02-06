from functools import reduce
import math
import re


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


def ignore_keys(d, keys):
    d_keys = d.keys()
    d2 = d.copy()
    for key in keys:
        if key in d_keys:
            d2.pop(key)
    return d2


def ignore_keys_with_blank_values(d):
    d2 = d.copy()
    for key, value in d.items():
        if not value:
            d2.pop(key)
    return d2


def extract(d, keys):
    def _build(obj, key):
        val = None
        if key in d:
            val = d[key]
        if val is not None:
            obj[key] = val
        return obj
    return reduce(_build, keys, {})


def extract_arrays(input_data):
    arr = []
    for k, v in input_data.items():
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


def merge_dict(a, b):
    c = a.copy()
    c.update(b)
    return c


def replace_dict_nan_value(d):
    def _replace_nan_value(v):
        if type(v) == float and math.isnan(v):
            return None
        return v
    return {k: _replace_nan_value(v) for k, v in d.items()}
