# Copied from ai/src/column_type_detector.py
import re
import warnings

import numpy as np

from mage_ai.shared.array import subtract

DATETIME_MATCHES_THRESHOLD = 0.5
MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES = 40

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

NUMBER_TYPES = [NUMBER, NUMBER_WITH_DECIMALS]

STRING_TYPES = [EMAIL, PHONE_NUMBER, TEXT, ZIP_CODE]

COLUMN_TYPES = [
    CATEGORY,
    CATEGORY_HIGH_CARDINALITY,
    DATETIME,
    EMAIL,
    NUMBER,
    NUMBER_WITH_DECIMALS,
    PHONE_NUMBER,
    TEXT,
    TRUE_OR_FALSE,
    ZIP_CODE,
]
REGEX_DATETIME_PATTERN = \
    r'^[\d]{2,4}-[\d]{1,2}-[\d]{1,2}$|^[\d]{2,4}-[\d]{1,2}-[\d]{1,2}[Tt ]{1}[\d]{1,2}:[\d]{1,2}' \
    r'[:]{0,1}[\d]{1,2}[\.]{0,1}[\d]*|^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$|^\d{1,4}' \
    r'[-\/]{1}\d{1,2}[-\/]{1}\d{1,4}$|(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|' \
    r'May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|' \
    r'Dec(?:ember)?)\s+(\d{1,2})[\s,]+(\d{2,4})'
REGEX_EMAIL_PATTERN = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
REGEX_EMAIL = re.compile(REGEX_EMAIL_PATTERN)
REGEX_INTEGER_PATTERN = r'^[\-]{0,1}[\$]{0,1}[0-9,]+$'
REGEX_INTEGER = re.compile(REGEX_INTEGER_PATTERN)
REGEX_NUMBER_PATTERN = \
    r'^[\-]{0,1}[\$]{0,1}[0-9,]+\.[0-9]*%{0,1}$|^[\-]{0,1}[\$]{0,1}[0-9,]+%{0,1}$'
REGEX_NUMBER = re.compile(REGEX_NUMBER_PATTERN)
REGEX_PHONE_NUMBER_PATTERN = \
    r'^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$'
REGEX_PHONE_NUMBER = re.compile(REGEX_PHONE_NUMBER_PATTERN)
REGEX_ZIP_CODE_PATTERN = r'^\d{3,5}(?:[-\s]\d{4})?$'
REGEX_ZIP_CODE = re.compile(REGEX_ZIP_CODE_PATTERN)


def infer_column_types(df, **kwargs):
    binary_feature_names = []
    category_feature_names = []
    datetime_feature_names = []
    email_features = []
    float_feature_names = []
    integer_feature_names = []
    non_number_feature_names = []
    phone_number_feature_names = []
    text_feature_names = []
    zip_code_feature_names = []

    for idx, col_type in enumerate(df.dtypes):
        col_name = df.columns[idx]
        if 'datetime64' in str(col_type):
            datetime_feature_names.append(col_name)
        elif col_type == 'object':
            df_sub = df[col_name].copy()
            df_sub = df_sub.replace(r'^\s+$', np.nan, regex=True)
            df_sub = df_sub.dropna()
            df_sub = df_sub.apply(lambda x: x.strip() if type(x) is str else x)
            if df_sub.empty:
                non_number_feature_names.append(col_name)
            else:
                first_item = df_sub.iloc[0]
                if type(first_item) is list:
                    text_feature_names.append(col_name)
                elif type(first_item) is bool or type(first_item) is np.bool_:
                    if len(df[col_name].unique()) <= 2:
                        binary_feature_names.append(col_name)
                    else:
                        category_feature_names.append(col_name)
                elif len(df[col_name].unique()) <= 2:
                    binary_feature_names.append(col_name)
                else:
                    df_sub = df_sub.astype(str)
                    incorrect_emails = len(
                        df_sub[~df_sub.str.contains(REGEX_EMAIL)].index,
                    )
                    warnings.filterwarnings('ignore', 'This pattern has match groups')
                    nums = df_sub[~df_sub.str.contains(REGEX_PHONE_NUMBER)].index
                    incorrect_phone_numbers = len(nums)
                    incorrect_zip_codes = len(
                        df_sub[~df_sub.str.contains(REGEX_ZIP_CODE)].index,
                    )

                    if all(df_sub.str.contains(REGEX_INTEGER)):
                        integer_feature_names.append(col_name)
                    elif all(df_sub.str.contains(REGEX_NUMBER)):
                        float_feature_names.append(col_name)
                    elif incorrect_emails / len(df_sub.index) <= 0.99:
                        email_features.append(col_name)
                    elif incorrect_phone_numbers / len(df_sub.index) <= 0.99:
                        phone_number_feature_names.append(col_name)
                    elif incorrect_zip_codes / len(df_sub.index) <= 0.99:
                        zip_code_feature_names.append(col_name)
                    else:
                        non_number_feature_names.append(col_name)
        elif col_type == 'bool':
            binary_feature_names.append(col_name)
        elif np.issubdtype(col_type, np.floating):
            float_feature_names.append(col_name)
        elif np.issubdtype(col_type, np.integer):
            df_sub = df[col_name].copy()
            df_sub = df_sub.dropna()
            if df_sub.min() >= 100 and df_sub.max() <= 99999 and 'zip' in col_name.lower():
                zip_code_feature_names.append(col_name)
            else:
                integer_feature_names.append(col_name)

    number_feature_names = float_feature_names + integer_feature_names
    binary_feature_names += \
        [col for col in number_feature_names if df[col].nunique(dropna=False) == 2]
    binary_feature_names += \
        [col for col in non_number_feature_names if df[col].nunique(dropna=False) == 2]
    float_feature_names = [col for col in float_feature_names if col not in binary_feature_names]
    integer_feature_names = \
        [col for col in integer_feature_names if col not in binary_feature_names]

    for col_name in subtract(non_number_feature_names, binary_feature_names):
        df_drop_na = df[col_name].dropna()
        if df_drop_na.empty:
            text_feature_names.append(col_name)
        else:
            matches = df_drop_na.astype(str).str.contains(REGEX_DATETIME_PATTERN)
            matches = matches.where(matches).dropna()
            if type(df_drop_na.iloc[0]) is list:
                text_feature_names.append(col_name)
            elif len(df_drop_na[matches.index]) / len(df_drop_na) >= DATETIME_MATCHES_THRESHOLD:
                datetime_feature_names.append(col_name)
            elif df_drop_na.nunique() / len(df_drop_na) >= 0.8:
                text_feature_names.append(col_name)
            else:
                word_count, _ = \
                    df[col_name].dropna().map(lambda x: (len(str(x).split(' ')), str(x))).max()
                if word_count > MAXIMUM_WORD_LENGTH_FOR_CATEGORY_FEATURES:
                    text_feature_names.append(col_name)
                else:
                    category_feature_names.append(col_name)

    low_cardinality_category_feature_names = \
        [col for col in category_feature_names if df[col].nunique() <= kwargs.get(
            'category_cardinality_threshold',
            255,
        )]
    high_cardinality_category_feature_names = \
        [col for col in category_feature_names if col not in low_cardinality_category_feature_names]

    column_types = {}
    array_types_mapping = {
        CATEGORY: low_cardinality_category_feature_names,
        CATEGORY_HIGH_CARDINALITY: high_cardinality_category_feature_names,
        DATETIME: datetime_feature_names,
        EMAIL: email_features,
        NUMBER: integer_feature_names,
        NUMBER_WITH_DECIMALS: float_feature_names,
        PHONE_NUMBER: phone_number_feature_names,
        TEXT: text_feature_names,
        TRUE_OR_FALSE: binary_feature_names,
        ZIP_CODE: zip_code_feature_names,
    }
    for col_type, arr in array_types_mapping.items():
        for col in arr:
            column_types[col] = col_type

    return column_types
