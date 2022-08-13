from typing import Dict, List
import json


# currently only parses single value arguments
def parse_arguments(args: List[str]) -> Dict[str, any]:
    args_parsed = dict()
    for i in range(len(args)):
        arg = args[i]
        if arg.startswith('--'):
            key = arg[2:]
            value = True
            if len(args) > i+1 and not args[i+1].startswith('--'):
                value = args[i+1]
            args_parsed[key] = value
    return args_parsed


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
