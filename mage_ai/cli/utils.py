from typing import Any, Dict, List, Union
import json


def parse_runtime_variables(variables: List[str]) -> Dict[str, Any]:
    """
    Returns a dictionary of variable to parsed values.
    """
    vars_parsed = dict()

    if variables is None:
        return vars_parsed
    for i in range(0, len(variables), 2):
        key = variables[i]
        try:
            value = variables[i + 1]
        except IndexError:
            value = None
        vars_parsed[key] = get_value(value)
    return vars_parsed


def get_value(value: Union[str, None]) -> Any:
    """
    Returns parsed value.

    If the string is a valid JSON object, deserializes it to a Python object.
    Otherwise, passes the original value.
    """
    if value is not None:
        try:
            return json.loads(value)
        except json.decoder.JSONDecodeError:
            pass
    return value
