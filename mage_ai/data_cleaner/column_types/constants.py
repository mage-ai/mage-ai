from enum import Enum


class ColumnTypes(str, Enum):
    CATEGORY = 'category'
    CATEGORY_HIGH_CARDINALITY = 'category_high_cardinality'
    DATETIME = 'datetime'
    EMAIL = 'email'
    NUMBER = 'number'
    NUMBER_WITH_DECIMALS = 'number_with_decimals'
    PHONE_NUMBER = 'phone_number'
    TEXT = 'text'
    TRUE_OR_FALSE = 'true_or_false'
    ZIP_CODE = 'zip_code'


CATEGORICAL_TYPES = frozenset(
    [ColumnTypes.CATEGORY, ColumnTypes.CATEGORY_HIGH_CARDINALITY, ColumnTypes.TRUE_OR_FALSE]
)
NUMBER_TYPES = frozenset([ColumnTypes.NUMBER, ColumnTypes.NUMBER_WITH_DECIMALS])
STRING_TYPES = frozenset(
    [ColumnTypes.EMAIL, ColumnTypes.PHONE_NUMBER, ColumnTypes.TEXT, ColumnTypes.ZIP_CODE]
)
