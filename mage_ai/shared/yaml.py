from typing import Dict, List, Union


def trim_strings(data: Union[Dict, List, str]) -> Union[Dict, List, str]:
    if isinstance(data, dict):
        return {k: trim_strings(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [trim_strings(item) for item in data]
    elif isinstance(data, str):
        return data.rstrip()  # Remove trailing whitespace and newlines
    else:
        return data
