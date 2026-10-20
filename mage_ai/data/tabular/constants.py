from enum import Enum

# Cannot use any names with __ in the beginning or end or else PyArrow won’t read those files
# when loading data into a PyArrow Table.
COLUMN_CHUNK = 'mage_chunk'
DEFAULT_BATCH_ITEMS_VALUE = 1_000_000
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
