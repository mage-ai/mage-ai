import random


def batch(iterable, n=1):
    l = len(iterable)
    for ndx in range(0, l, n):
        yield iterable[ndx:min(ndx + n, l)]


def difference(li1, li2):
    li_dif = [i for i in li1 + li2 if i not in li1 or i not in li2]
    return li_dif


def flatten(arr):
    return [item for sublist in arr for item in sublist]


def find(condition, arr, map=None):
    try:
        return next(map(x) if map else x for x in arr if condition(x))
    except StopIteration:
        return None


def sample(arr):
    return arr[random.randrange(0, len(arr))]


def subtract(arr1, arr2):
    return [i for i in arr1 if i not in arr2]
