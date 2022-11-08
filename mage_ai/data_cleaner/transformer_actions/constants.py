from mage_ai.data_cleaner.column_types.constants import ColumnType
from enum import Enum
import pandas as pd
import numpy as np
import re


CONSTANT_IMPUTATION_DEFAULTS = {
    ColumnType.CATEGORY: 'missing',
    ColumnType.CATEGORY_HIGH_CARDINALITY: 'missing',
    ColumnType.DATETIME: pd.Timestamp.min,
    ColumnType.EMAIL: 'missing',
    ColumnType.LIST: '[]',
    ColumnType.NUMBER: 0,
    ColumnType.NUMBER_WITH_DECIMALS: 0,
    ColumnType.TEXT: 'missing',
    ColumnType.TRUE_OR_FALSE: 'missing',
    ColumnType.PHONE_NUMBER: 'missing',
    ColumnType.ZIP_CODE: 'missing',
}
CURRENCY_SYMBOLS = re.compile(r'(?:[\$\€\¥\₹\元\£]|(?:Rs)|(?:CAD))')
INVALID_VALUE_PLACEHOLDERS = {
    ColumnType.CATEGORY: 'invalid',
    ColumnType.CATEGORY_HIGH_CARDINALITY: 'invalid',
    ColumnType.DATETIME: pd.NaT,
    ColumnType.EMAIL: 'invalid',
    ColumnType.LIST: 'invalid',
    ColumnType.NUMBER: np.nan,
    ColumnType.NUMBER_WITH_DECIMALS: np.nan,
    ColumnType.TEXT: 'invalid',
    ColumnType.TRUE_OR_FALSE: 'invalid',
    ColumnType.PHONE_NUMBER: 'invalid',
    ColumnType.ZIP_CODE: 'invalid',
}


class ActionType(str, Enum):
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
    REMOVE_OUTLIERS = 'remove_outliers'
    SCALE = 'scale'
    SELECT = 'select'
    SHIFT_DOWN = 'shift_down'
    SHIFT_UP = 'shift_up'
    SORT = 'sort'
    SUM = 'sum'
    UNION = 'union'
    UPDATE_TYPE = 'update_type'
    UPDATE_VALUE = 'update_value'
    NORMALIZE = 'normalize'
    STANDARDIZE = 'standardize'


class Axis(str, Enum):
    COLUMN = 'column'
    ROW = 'row'


class VariableType(str, Enum):
    FEATURE = 'feature'
    FEATURE_SET = 'feature_set'
    FEATURE_SET_VERSION = 'feature_set_version'


class Operator(str, Enum):
    CONTAINS = 'contains'
    NOT_CONTAINS = 'not contains'
    EQUALS = '=='
    NOT_EQUALS = '!='
    GREATER_THAN = '>'
    GREATER_THAN_OR_EQUALS = '>='
    LESS_THAN = '<'
    LESS_THAN_OR_EQUALS = '<='


class ImputationStrategy(str, Enum):
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
