import os
import sys

from mage_ai.shared.constants import (
    ENV_DEV,
    ENV_PROD,
    ENV_STAGING,
    ENV_TEST,
    ENV_TEST_MAGE,
)


def is_deus_ex_machina():
    return int(os.getenv('DEUS_EX_MACHINA', 0) or 0) == 1


def is_debug():
    return int(os.getenv('DEBUG', 0) or 0) == 1


def is_dev():
    return os.getenv('ENV', None) == 'dev' or os.getenv('ENV', None) == 'development'


def is_test():
    return os.getenv('ENV', None) == 'test'


def is_test_mage():
    return os.getenv('ENV', None) == 'test_mage' or any('unittest' in v for v in sys.argv)


def is_production():
    return os.getenv('ENV', None) == 'production' or os.getenv('ENV', None) == 'prod'


def is_staging():
    return os.getenv('ENV', None) == 'staging'


def get_env():
    if is_test():
        return ENV_TEST
    elif is_test_mage():
        return ENV_TEST_MAGE
    elif is_production():
        return ENV_PROD
    elif is_staging():
        return ENV_STAGING
    else:
        return ENV_DEV
