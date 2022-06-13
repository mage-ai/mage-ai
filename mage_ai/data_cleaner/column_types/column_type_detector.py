from mage_ai.data_cleaner.column_types.constants import NUMBER_TYPES, ColumnType
from mage_ai.data_cleaner.shared.multi import run_parallel_multiple_args
from mage_ai.data_cleaner.transformer_actions.constants import (
    CONSTANT_IMPUTATION_DEFAULTS,
    INVALID_VALUE_PLACEHOLDERS,
)
import numpy as np
import pandas as pd
import re

DATETIME_MATCHES_THRESHOLD = 0.5
MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES = 40
MULTITHREAD_MAX_NUM_ENTRIES = 50000
NUMBER_TYPE_MATCHES_THRESHOLD = 0.8
STRING_TYPE_MATCHES_THRESHOLD = 0.3

REGEX_DATETIME_PATTERN = r'^\d{2,4}-\d{1,2}-\d{1,2}$|^\d{2,4}-\d{1,2}-\d{1,2}[Tt ]{1}\d{1,2}:\d{1,2}[:]{0,1}\d{1,2}[\.]{0,1}\d*|^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$|^\d{1,4}[-\/]{1}\d{1,2}[-\/]{1}\d{1,2}$|^\d{1,2}[-\/]{1}\d{1,2}[-\/]{1}\d{1,4}$|^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}[Tt ]{1}\d{1,2}:\d{1,2}[:]{0,1}\d{1,2}[\.]{0,1}\d*|(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[\s,]+(\d{2,4})'
REGEX_DATETIME = re.compile(REGEX_DATETIME_PATTERN)
REGEX_EMAIL_PATTERN = r'^[a-zA-Z0-9_.+#-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
REGEX_EMAIL = re.compile(REGEX_EMAIL_PATTERN)
REGEX_INTEGER_PATTERN = r'^\-{0,1}\s*(?:(?:[$€¥₹£]|Rs|CAD){0,1}\s*(?:[0-9]+(?:,[0-9]+)*|[0-9]+){0,1}|(?:[0-9]+(?:,[0-9]+)*|[0-9]+){0,1}\s*(?:[元€$]|CAD){0,1})$'
REGEX_INTEGER = re.compile(REGEX_INTEGER_PATTERN)
REGEX_FLOAT_NEW_SYM = re.compile(r'[\.\%]')
REGEX_NUMBER_PATTERN = r'^\-{0,1}\s*(?:(?:[$€¥₹£]|Rs|CAD){0,1}\s*(?:[0-9]+(?:,[0-9]+)*|[0-9]+){0,1}(?:\.[0-9]*){0,1}|(?:[0-9]+(?:,[0-9]+)*|[0-9]+){0,1}(?:\.[0-9]*){0,1}\s*(?:[元€$]|CAD){0,1})\s*\%{0,1}$'
REGEX_NUMBER = re.compile(REGEX_NUMBER_PATTERN)
REGEX_PHONE_NUMBER_PATTERN = (
    r'^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$'
)
REGEX_PHONE_NUMBER = re.compile(REGEX_PHONE_NUMBER_PATTERN)
REGEX_ZIP_CODE_PATTERN = r'^\d{3,5}(?:[-\s]\d{4})?$'
REGEX_ZIP_CODE = re.compile(REGEX_ZIP_CODE_PATTERN)

RESERVED_PHONE_NUMBER_WORDS = frozenset(['phone', 'landline'])
RESERVED_ZIP_CODE_WORDS = frozenset(['zip', 'postal', 'zipcode', 'postcode'])


def str_in_set(string, string_set):
    return any(entry in string for entry in string_set)


def find_syntax_errors(series, column_type):
    if len(series) == 0:
        return pd.Series([])

    dtype = series.dtype
    str_series = series
    filter_invalid, filter_null = False, False
    check_syntax_errors = True
    if column_type == ColumnType.EMAIL:
        filter_invalid, filter_null = True, True
        pattern = REGEX_EMAIL
    elif column_type == ColumnType.PHONE_NUMBER:
        str_series = str_series.astype(str)
        filter_invalid, filter_null = True, True
        pattern = REGEX_PHONE_NUMBER
    elif column_type == ColumnType.ZIP_CODE:
        str_series = str_series.astype(str)
        filter_invalid, filter_null = True, True
        pattern = REGEX_ZIP_CODE
    elif (
        column_type in NUMBER_TYPES
        and not np.issubdtype(dtype, np.integer)
        and not np.issubdtype(dtype, np.floating)
    ):
        str_series = str_series.astype(str)
        pattern = REGEX_NUMBER
    elif (
        column_type == ColumnType.DATETIME
        and not np.issubdtype(dtype, np.datetime64)
        and not dtype is pd.Timestamp
    ):
        str_series = str_series.astype(str)
        pattern = REGEX_DATETIME
    else:
        check_syntax_errors = False
        pattern = None

    mask = pd.Series([False] * len(series))
    mask.index = series.index
    if check_syntax_errors:
        mask |= ~str_series.str.match(pattern, na=True)
        if filter_invalid:
            mask &= ~str_series.str.match(INVALID_VALUE_PLACEHOLDERS[column_type], na=True)
        if filter_null:
            mask &= ~str_series.str.match(CONSTANT_IMPUTATION_DEFAULTS[column_type], na=True)
    return mask & series.notna()


def infer_number_type(series, column_name, dtype):
    clean_series = series.dropna()
    length = len(clean_series)
    if length == 0:
        mdtype = ColumnType.NUMBER_WITH_DECIMALS
    else:
        correct_phone_nums = (
            (clean_series >= 1e9) & (clean_series < 1e12) & (np.floor(clean_series) == clean_series)
        ).sum()
        if (
            correct_phone_nums / length >= NUMBER_TYPE_MATCHES_THRESHOLD
            and 'phone' in column_name.lower()
        ):
            mdtype = ColumnType.PHONE_NUMBER
        else:
            if np.issubdtype(dtype, np.integer):
                if (
                    clean_series.min() >= 100
                    and clean_series.max() <= 99999
                    and str_in_set(column_name.lower(), RESERVED_ZIP_CODE_WORDS)
                ):
                    mdtype = ColumnType.ZIP_CODE
                else:
                    mdtype = ColumnType.NUMBER
            elif np.issubdtype(dtype, np.floating):
                mdtype = ColumnType.NUMBER_WITH_DECIMALS
    return mdtype


def infer_column_type(series, column_name, dtype, kwargs):
    mdtype = None
    if 'datetime64' in str(dtype):
        mdtype = ColumnType.DATETIME
    elif dtype == 'object':
        mdtype = infer_object_type(series, column_name, kwargs)
    elif dtype == 'bool':
        mdtype = ColumnType.TRUE_OR_FALSE
    elif np.issubdtype(dtype, np.floating) or np.issubdtype(dtype, np.integer):
        mdtype = infer_number_type(series, column_name, dtype)
    if mdtype in NUMBER_TYPES and series.nunique(dropna=False) == 2:
        mdtype = ColumnType.TRUE_OR_FALSE

    return mdtype


def infer_object_type(series, column_name, kwargs):
    clean_series = series.apply(lambda x: x.strip(' \'\"') if type(x) is str else x)
    clean_series = clean_series.map(lambda x: x if (not isinstance(x, str) or x != '') else np.nan)
    clean_series = clean_series.dropna().astype(str)

    series_nunique = series.nunique(dropna=False)
    clean_series_nunique = clean_series.nunique()

    exact_dtype = type(clean_series.iloc[0]) if clean_series.count() else None
    if exact_dtype is list:
        mdtype = ColumnType.TEXT
    elif np.issubdtype(exact_dtype, np.bool_):
        if clean_series_nunique <= 2:
            mdtype = ColumnType.TRUE_OR_FALSE
        else:
            mdtype = ColumnType.CATEGORY
    elif clean_series_nunique <= 2:
        mdtype = ColumnType.TRUE_OR_FALSE
    else:
        length = len(clean_series)
        if all(clean_series.str.match(REGEX_NUMBER)):
            if clean_series.str.contains(REGEX_FLOAT_NEW_SYM).sum():
                mdtype = ColumnType.NUMBER_WITH_DECIMALS
            else:
                lowercase_column_name = column_name.lower()
                correct_phone_nums = clean_series.str.match(REGEX_PHONE_NUMBER).sum()
                correct_zip_codes = clean_series.str.match(REGEX_ZIP_CODE).sum()
                if correct_phone_nums / length >= NUMBER_TYPE_MATCHES_THRESHOLD and str_in_set(
                    lowercase_column_name, RESERVED_PHONE_NUMBER_WORDS
                ):
                    mdtype = ColumnType.PHONE_NUMBER
                elif correct_zip_codes / length >= NUMBER_TYPE_MATCHES_THRESHOLD and str_in_set(
                    lowercase_column_name, RESERVED_ZIP_CODE_WORDS
                ):
                    mdtype = ColumnType.ZIP_CODE
                else:
                    mdtype = ColumnType.NUMBER
        else:
            matches = clean_series.str.match(REGEX_DATETIME).sum()
            if matches / length >= DATETIME_MATCHES_THRESHOLD:
                mdtype = ColumnType.DATETIME
            else:
                correct_emails = clean_series.str.match(REGEX_EMAIL).sum()
                correct_phone_nums = clean_series.str.match(REGEX_PHONE_NUMBER).sum()
                correct_zip_codes = clean_series.str.match(REGEX_ZIP_CODE).sum()
                lowercase_column_name = column_name.lower()
                if correct_emails / length >= STRING_TYPE_MATCHES_THRESHOLD:
                    mdtype = ColumnType.EMAIL
                elif correct_phone_nums / length >= STRING_TYPE_MATCHES_THRESHOLD and str_in_set(
                    lowercase_column_name, RESERVED_PHONE_NUMBER_WORDS
                ):
                    mdtype = ColumnType.PHONE_NUMBER
                elif correct_zip_codes / length >= STRING_TYPE_MATCHES_THRESHOLD and str_in_set(
                    lowercase_column_name, RESERVED_ZIP_CODE_WORDS
                ):
                    mdtype = ColumnType.ZIP_CODE
                elif series_nunique == 2:
                    mdtype = ColumnType.TRUE_OR_FALSE
                else:
                    if type(exact_dtype) is list:
                        mdtype = ColumnType.TEXT
                    elif clean_series_nunique / length >= 0.8:
                        mdtype = ColumnType.TEXT
                    else:
                        word_count = clean_series.map(lambda x: len(str(x).split(' '))).max()
                        if word_count > MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES:
                            mdtype = ColumnType.TEXT
                        else:
                            if clean_series_nunique <= kwargs.get(
                                'category_cardinality_threshold', 255
                            ):
                                mdtype = ColumnType.CATEGORY
                            else:
                                mdtype = ColumnType.CATEGORY_HIGH_CARDINALITY
    return mdtype


def infer_column_types(df, **kwargs):
    column_types = kwargs.get('column_types', {})
    df_columns = df.columns.tolist()
    new_cols = [col for col in df_columns if col not in column_types]
    columns = [df[col] for col in new_cols]
    kwarg_list = [kwargs] * len(new_cols)
    ctypes = {k: v for k, v in column_types.items() if k in df_columns}
    num_entries = len(df)
    if num_entries > MULTITHREAD_MAX_NUM_ENTRIES:
        types = run_parallel_multiple_args(
            infer_column_type, columns, new_cols, df.dtypes[new_cols], kwarg_list
        )
    else:
        types = map(infer_column_type, columns, new_cols, df.dtypes[new_cols], kwarg_list)
    for col, dtype in zip(new_cols, types):
        ctypes[col] = dtype
    return ctypes
