import os
from typing import Dict, List

MIN_SECRET_LENGTH = 8
WHITELISTED_ENV_VARS = set([
    'MAGE_DATA_DIR',
    'MAGE_REPO_PATH',
    'HOME',
    'PWD',
    'PYTHONPATH',
])


def filter_out_env_var_values(value: str) -> str:
    env_var_values = dict(os.environ).values()
    whitelisted_env_var_values = set([os.getenv(k) for k in WHITELISTED_ENV_VARS if os.getenv(k)])
    env_var_values = [v for v in env_var_values
                      if v and len(v) >= MIN_SECRET_LENGTH
                      and v not in whitelisted_env_var_values]
    return filter_out_values(value, env_var_values)


def filter_out_config_values(log: str, config: Dict) -> str:
    """
    Used for integration pipeline logging security. Filters out values from
    the passed in config if the config value is a string and is over
    MIN_SECRET_LENGTH characters long.

    Args:
        log (str): The log to filter.
        config (Dict[str, any]): The config to get filter values from.

    Returns:
        str: Log with config values filtered out.
    """
    if not log or not config:
        return log
    values = config.values()
    secret_values = [v for v in values if v and isinstance(v, str) and len(v) >= MIN_SECRET_LENGTH]
    return filter_out_values(log, secret_values)


def filter_out_values(log: str, values: List[str]) -> str:
    if not log or not values:
        return log
    values.sort(key=len, reverse=True)
    log_clean = log
    for value in values:
        replace_value = '*' * len(value)
        log_clean = log_clean.replace(value, replace_value)
    return log_clean
