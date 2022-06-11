from mage_ai.data_cleaner.column_type_detector import (
    CATEGORY,
    CATEGORY_HIGH_CARDINALITY,
    DATETIME,
    EMAIL,
    NUMBER,
    NUMBER_WITH_DECIMALS,
    TEXT,
    PHONE_NUMBER,
    ZIP_CODE,
)
import pandas as pd
import numpy as np
import re

CONSTANT_IMPUTATION_DEFAULTS = {
    CATEGORY: 'missing',
    CATEGORY_HIGH_CARDINALITY: 'missing',
    DATETIME: pd.Timestamp.min,
    EMAIL: 'missing',
    NUMBER: 0,
    NUMBER_WITH_DECIMALS: 0,
    TEXT: 'missing',
    PHONE_NUMBER: 'missing',
    ZIP_CODE: 'missing',
}
CURRENCY_SYMBOLS = re.compile(r'(?:[\$\€\¥\₹\元\£]|(?:Rs)|(?:CAD))')
INVALID_VALUE_PLACEHOLDERS = {
    CATEGORY: 'invalid',
    CATEGORY_HIGH_CARDINALITY: 'invalid',
    DATETIME: 'invalid',
    EMAIL: 'invalid',
    NUMBER: np.nan,
    NUMBER_WITH_DECIMALS: np.nan,
    TEXT: 'invalid',
    PHONE_NUMBER: 'invalid',
    ZIP_CODE: 'invalid',
}


class ActionType:
    ADD = 'add'
    AVERAGE = 'average'
    CLEAN_COLUMN_NAME = 'clean_column_name'
    COUNT = 'count'
    COUNT_DISTINCT = 'count_distinct'
    CUSTOM = 'custom'
    DIFF = 'diff'
    DROP_DUPLICATE = 'drop_duplicate'
    EXPAND_COLUMN = 'expand_column'
    EXPLODE = 'explode'
    FILTER = 'filter'
    FIRST = 'first'
    FIX_SYNTAX_ERRORS = 'fix_syntax_errors'
    GROUP = 'group'
    IMPUTE = 'impute'
    JOIN = 'join'
    LAST = 'last'
    LIMIT = 'limit'
    MAX = 'max'
    MEDIAN = 'median'
    MIN = 'min'
    MODE = 'mode'
    REFORMAT = 'reformat'
    REMOVE = 'remove'
    SCALE = 'scale'
    SELECT = 'select'
    SHIFT_DOWN = 'shift_down'
    SHIFT_UP = 'shift_up'
    SORT = 'sort'
    SUM = 'sum'
    UNION = 'union'
    UPDATE_TYPE = 'update_type'
    UPDATE_VALUE = 'update_value'


class Axis:
    COLUMN = 'column'
    ROW = 'row'


class VariableType:
    FEATURE = 'feature'
    FEATURE_SET = 'feature_set'
    FEATURE_SET_VERSION = 'feature_set_version'


class Operator:
    CONTAINS = 'contains'
    NOT_CONTAINS = 'not contains'
    EQUALS = '=='
    NOT_EQUALS = '!='
    GREATER_THAN = '>'
    GREATER_THAN_OR_EQUALS = '>='
    LESS_THAN = '<'
    LESS_THAN_OR_EQUALS = '<='


class ImputationStrategy:
    AVERAGE = 'average'
    COLUMN = 'column'
    CONSTANT = 'constant'
    MEDIAN = 'median'
    MODE = 'mode'
    NOOP = 'no_action'
    RANDOM = 'random'
    ROW_RM = 'remove_rows'
    SEQ = 'sequential'


class NameConventionPatterns:
    SNAKE = re.compile(r'^[a-z]+(?:\_[a-z0-9]+)*$')
    CAMEL = re.compile(r'^[a-z]+(?:[A-Z][a-z]*)*$')
    CAMEL_COMPONENT = re.compile(r'^[a-z]+')
    PASCAL = re.compile(r'^(?:[A-Z][a-z]*)+$')
    PASCAL_COMPONENT = re.compile(r'[A-Z][a-z]*')
    UPPERCASE = re.compile(r'^[A-Z0-9]+$')
    NON_ALNUM = re.compile(r'[^a-zA-Z\_0-9]')
    CONNECTORS = re.compile(r'[\s\-\.]')
    LOWERCASE = re.compile(r'^[a-z0-9\_]+$')
