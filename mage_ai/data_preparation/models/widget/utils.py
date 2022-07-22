import numpy as np
import pandas as pd


def convert_to_list(arr, limit=None):
    if type(arr) is pd.Series or type(arr) is pd.Index:
        return arr[:limit].tolist()
    elif type(arr) is pd.DataFrame:
        return arr[:limit].to_numpy().tolist()
    elif type(arr) is np.ndarray:
        return arr[:limit].tolist()

    return arr
