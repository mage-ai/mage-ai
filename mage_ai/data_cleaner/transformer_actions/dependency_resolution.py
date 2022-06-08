from pandas import DataFrame
from typing import Tuple, Dict
import re

"""
Resolves any dependencies and requirements before
a cleaning action is made. All dependency resolution functions return both
- a boolean value describing whether all dependencies are resolved
- a string message describing the error in the case that dependencies aren't resolved
"""


def default_resolution(df: DataFrame, action: Dict) -> Tuple[bool, str]:
    return True, None


def isolate(action_code):
    split_code = action_code.split(" and ")
    results = []
    for clause in split_code:
        results.extend(clause.split(" or "))
    return [result.strip(' ()') for result in results]


def resolve_filter_action(df: DataFrame) -> Tuple[bool, str]:
    for name in df.columns:
        if re.search('\s', name):
            return (
                False,
                'Column name contains whitespace or newline '
                'characters which cannot be used in filter actions',
            )
    return True, None
