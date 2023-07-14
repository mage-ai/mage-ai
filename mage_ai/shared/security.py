import os
from collections.abc import Iterable

MIN_SECRET_ENV_VAR_LENGTH = 8
WHITELISTED_ENV_VARS = set([
    'MAGE_DATA_DIR',
    'MAGE_REPO_PATH',
    'HOME',
    'PWD',
    'PYTHONPATH',
])


def filter_out_env_var_values(value: str):
    env_var_values = dict(os.environ).values()
    whitelisted_env_var_values = set([os.getenv(k) for k in WHITELISTED_ENV_VARS if os.getenv(k)])
    env_var_values = [v for v in env_var_values
                      if v and len(v) >= MIN_SECRET_ENV_VAR_LENGTH
                      and v not in whitelisted_env_var_values]
    return filter_out_values(value, env_var_values)


def filter_out_values(log: str, values: Iterable):
    if not values:
        return log
    values = [v for v in values if isinstance(v, str)]
    values.sort(key=len, reverse=True)
    log_clean = log
    for value in values:
        replace_value = '*' * len(value)
        log_clean = log_clean.replace(value, replace_value)
    return log_clean
