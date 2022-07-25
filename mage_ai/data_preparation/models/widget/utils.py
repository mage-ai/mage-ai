from .constants import AggregationFunction
from mage_ai.shared.parsers import encode_complex
import numpy as np
import pandas as pd


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
    return [encode_complex(v) for v in arr]


def build_metric_name(metric):
    aggregation = metric['aggregation']
    column = metric['column']
    return f'{aggregation}({column})'


def calculate_metrics_for_group(metrics, group):
    values = {}

    for metric in metrics:
        aggregation = metric['aggregation']
        column = metric['column']
        series = group[column]
        value = 0

        if AggregationFunction.AVERAGE == aggregation:
            value = sum(series) / len(series)
        elif AggregationFunction.COUNT == aggregation:
            value = len(series)
        elif AggregationFunction.COUNT_DISTINCT == aggregation:
            value = len(series.unique())
        elif AggregationFunction.MAX == aggregation:
            value = max(series)
        elif AggregationFunction.MEDIAN == aggregation:
            value = sorted(series)[int(len(series) / 2)]
        elif AggregationFunction.MIN == aggregation:
            value = min(series)
        elif AggregationFunction.MODE == aggregation:
            value = sorted(
                series.value_counts().items(),
                key=lambda t: t[1],
                reverse=True,
            )[0][0]
        elif AggregationFunction.SUM == aggregation:
            value = sum(series)

        values[build_metric_name(metric)] = value

    return values
