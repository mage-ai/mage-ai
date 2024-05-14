import random
from collections.abc import Iterable
from typing import Any


def batch(iterable, n=1):
    length = len(iterable)
    for ndx in range(0, length, n):
        yield iterable[ndx: min(ndx + n, length)]


def difference(li1, li2):
    li1_lookup = set(li1)
    li2_lookup = set(li2)
    return [i for i in li1 + li2 if i not in li1_lookup or i not in li2_lookup]


def flatten(arr):
    return [item for sublist in arr for item in sublist]


def find(condition, arr, map=None):
    try:
        return next(map(x) if map else x for x in arr if condition(x))
    except StopIteration:
        return None


def find_index(condition, arr):
    for idx, item in enumerate(arr):
        if condition(item):
            return idx
    return -1


def sample(arr):
    return arr[random.randrange(0, len(arr))]


def subtract(arr1, arr2):
    arr2_lookup = set(arr2)
    return [i for i in arr1 if i not in arr2_lookup]


def unique_by(arr1, key):
    mapping = {}
    arr2 = []
    for item in arr1:
        k = key(item)
        if k in mapping:
            continue
        arr2.append(item)
        mapping[k] = True
    return arr2


def is_iterable(
    obj: Any, exclude_dicts: bool = True, exclude_strings: bool = True
) -> bool:
    """
    Check if an object is iterable, optionally excluding strings.

    Args:
        obj: The object to check for iterability.
        exclude_strings (bool): Whether to consider strings as non-iterable (to exclude them).

    Returns:
        bool: True if the object is iterable; False otherwise.
    """
    if (exclude_strings and isinstance(obj, str)) or (
        exclude_dicts and isinstance(obj, dict)
    ):
        return False

    return isinstance(obj, Iterable)
