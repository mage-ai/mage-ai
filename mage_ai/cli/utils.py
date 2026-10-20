import json
import traceback
from typing import Any, Dict, Union


def parse_runtime_variables(variables_str: str) -> Dict[str, Any]:
    """
    Returns a dictionary of variable to parsed values.

    Args:
        variables_str (str): The variables json string

    Returns:
        Dict[str, Any]: The parsed variables dictionary
    """
    vars_parsed = dict()
    if not variables_str:
        return vars_parsed

    try:
        vars_parsed = json.loads(variables_str)
    except Exception:
        traceback.print_exc()
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
