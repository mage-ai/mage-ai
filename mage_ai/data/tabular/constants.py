from enum import Enum

COLUMN_CHUNK = 'chunk'
DEFAULT_BATCH_ITEMS_VALUE = 100_000
DEFAULT_BATCH_BYTE_VALUE = 1024 * 1024 * 100  # 100 MB
DEFAULT_BATCH_COUNT_VALUE = 1_000


class FilterComparison(Enum):
    EQUAL = '=='
    GREATER_THAN = '>'
    GREATER_THAN_OR_EQUAL = '>='
    LESS_THAN = '<'
    LESS_THAN_OR_EQUAL = '<='
    NOT_EQUAL = '!='


class BatchStrategy(Enum):
    BYTES = 'bytes'  # Byte size per batch
    COUNT = 'count'  # Number of batches
    ITEMS = 'items'  # Rows per batch
