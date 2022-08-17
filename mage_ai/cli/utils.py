from typing import Dict, List
import json


def parse_runtime_variables(variables: List[str]) -> Dict[str, any]:
    vars_parsed = dict()

    if variables is None:
        return vars_parsed
    for i in range(0, len(variables), 2):
        key = variables[i]
        try:
            value = variables[i+1]
        except IndexError:
            value = None
        vars_parsed[key] = get_value(value)
    return vars_parsed


def get_value(value: str) -> any:
    if value is not None:
        try:
            return json.loads(value)
        except json.decoder.JSONDecodeError:
            pass
    return value
