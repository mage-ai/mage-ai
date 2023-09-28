from typing import Dict, Union


def increment(metric_name: str, tags: Dict = {}) -> None:
    pass


def timing(metric_name: str, value: Union[float, int, str], tags: Dict = {}) -> None:
    pass
