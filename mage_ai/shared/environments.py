from mage_ai.shared.constants import (
    ENV_DEV,
    ENV_PROD,
    ENV_STAGING,
    ENV_TEST,
)
import os
import sys


def is_debug():
    return int(os.getenv('DEBUG', 0)) == 1


def is_dev():
    return os.getenv('ENV', None) == 'dev'


def is_test():
    return os.getenv('ENV', None) == 'test' or any('unittest' in v for v in sys.argv)


def is_production():
    return os.getenv('ENV', None) == 'production'


def is_staging():
    return os.getenv('ENV', None) == 'staging'


def get_env():
    if is_test():
        return ENV_TEST
    elif is_production():
        return ENV_PROD
    elif is_staging():
        return ENV_STAGING
    else:
        return ENV_DEV
