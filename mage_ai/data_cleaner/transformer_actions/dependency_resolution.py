from pandas import DataFrame
from typing import Dict, Tuple
import re

"""
Resolves any dependencies and requirements before
a cleaning action is made. All dependency resolution functions return both
- a boolean value describing whether all dependencies are resolved
- a string message describing the error in the case that dependencies aren't resolved
"""


def default_resolution(df: DataFrame, action: Dict) -> Tuple[bool, str]:
    return True, None


def resolve_filter_action(df: DataFrame, action: Dict) -> Tuple[bool, str]:
    for name in df.columns:
        if re.search(r'\s', name):
            return (
                False,
                'Column name contains whitespace or newline '
                'characters which cannot be used in filter actions',
            )
    return True, None
