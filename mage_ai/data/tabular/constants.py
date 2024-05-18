from enum import Enum

COLUMN_CHUNK = 'chunk'
DEFAULT_BATCH_SIZE = 100_000


class FilterComparison(Enum):
    EQUAL = '=='
    GREATER_THAN = '>'
    GREATER_THAN_OR_EQUAL = '>='
    LESS_THAN = '<'
    LESS_THAN_OR_EQUAL = '<='
    NOT_EQUAL = '!='
