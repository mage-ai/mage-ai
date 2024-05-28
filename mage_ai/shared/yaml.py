from typing import Dict, List, Union

import yaml

try:
    # Speed up yaml load performance with CLoader
    from yaml import CLoader as Loader
except Exception:
    from yaml import FullLoader as Loader


def trim_strings(data: Union[Dict, List, str]) -> Union[Dict, List, str]:
    if isinstance(data, dict):
        return {k: trim_strings(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [trim_strings(item) for item in data]
    elif isinstance(data, str):
        return data.rstrip()  # Remove trailing whitespace and newlines
    else:
        return data


def load_yaml(data):
    return yaml.load(data, Loader=Loader)
