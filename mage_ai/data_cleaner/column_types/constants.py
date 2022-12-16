from enum import Enum


class ColumnType(str, Enum):
    CATEGORY = 'category'
    CATEGORY_HIGH_CARDINALITY = 'category_high_cardinality'
    DATETIME = 'datetime'
    EMAIL = 'email'
    LIST = 'list'
    NUMBER = 'number'
    NUMBER_WITH_DECIMALS = 'number_with_decimals'
    PHONE_NUMBER = 'phone_number'
    TEXT = 'text'
    TRUE_OR_FALSE = 'true_or_false'
    ZIP_CODE = 'zip_code'


CATEGORICAL_TYPES = frozenset(
    [ColumnType.CATEGORY, ColumnType.CATEGORY_HIGH_CARDINALITY, ColumnType.TRUE_OR_FALSE]
)
NUMBER_TYPES = frozenset([ColumnType.NUMBER, ColumnType.NUMBER_WITH_DECIMALS])
STRING_TYPES = frozenset(
    [ColumnType.EMAIL, ColumnType.PHONE_NUMBER, ColumnType.TEXT, ColumnType.ZIP_CODE]
)
