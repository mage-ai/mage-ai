from pyspark.sql import types
from pyspark.sql.types import (
    BooleanType,
    DoubleType,
    IntegerType,
    StringType,
)
import re

COLUMN_TYPE_MAPPING = {
    'category': StringType,
    'category_high_cardinality': StringType,
    'datetime': StringType,
    'email': StringType,
    'number': IntegerType,
    'number_with_decimals': DoubleType,
    'phone_number': StringType,
    'text': StringType,
    'true_or_false': StringType,
    'zip_code': StringType,
}

GROUP_MOD_COLUMN = '__group_mod__'
ROW_NUMBER_COLUMN = '__row_number__'
ROW_NUMBER_LIT_COLUMN = '__row_number_lit__'
