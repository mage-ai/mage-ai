import re

CURRENCY_SYMBOLS = re.compile(r'(?:[\$\€\¥\₹\元\£]|(?:Rs)|(?:CAD))')


class ActionType():
    ADD = 'add'
    AVERAGE = 'average'
    CLEAN_COLUMN_NAME = 'clean_column_name'
    COUNT = 'count'
    COUNT_DISTINCT = 'count_distinct'
    DIFF = 'diff'
    DROP_DUPLICATE = 'drop_duplicate'
    EXPAND_COLUMN = 'expand_column'
    EXPLODE = 'explode'
    FILTER = 'filter'
    FIRST = 'first'
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


class Axis():
    COLUMN = 'column'
    ROW = 'row'


class VariableType():
    FEATURE = 'feature'
    FEATURE_SET = 'feature_set'
    FEATURE_SET_VERSION = 'feature_set_version'


class Operator():
    CONTAINS = 'contains'
    NOT_CONTAINS = 'not contains'
    EQUALS = '=='
    NOT_EQUALS = '!='
    GREATER_THAN = '>'
    GREATER_THAN_OR_EQUALS = '>='
    LESS_THAN = '<'
    LESS_THAN_OR_EQUALS = '<='

class ImputationStrategy():
    AVERAGE = 'average'
    COLUMN = 'column'
    MEDIAN = 'median'
    MODE = 'mode'
    NOOP = 'no_action'
    RANDOM = 'random'
    ROW_RM = 'remove_rows'
    SEQ = 'sequential'
