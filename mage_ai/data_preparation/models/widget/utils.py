import numpy as np
import pandas as pd
from mage_ai.shared.parsers import NpEncoder


encoder = NpEncoder()


def convert_to_list(arr, limit=None):
    if type(arr) in [pd.Index, pd.RangeIndex, pd.Series]:
        return arr[:limit].tolist()
    elif type(arr) is pd.DataFrame:
        return arr[:limit].to_numpy().tolist()
    elif type(arr) is np.ndarray:
        return arr[:limit].tolist()
    elif type(arr) is list:
        return [convert_to_list(arr2) for arr2 in arr]

    return arr


def encode_values_in_list(arr):
    return [encoder.default(v) for v in arr]
