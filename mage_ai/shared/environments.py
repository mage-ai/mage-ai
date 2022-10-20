import os
import sys


def is_debug():
    return int(os.getenv('DEBUG', 0)) == 1


def is_test():
    return os.getenv('ENV', None) == 'test' or any('unittest' in v for v in sys.argv)


def is_production():
    return os.getenv('ENV', None) == 'production' or any('unittest' in v for v in sys.argv)


def is_staging():
    return os.getenv('ENV', None) == 'staging'
