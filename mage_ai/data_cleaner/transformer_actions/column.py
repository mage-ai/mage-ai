from mage_ai.data_cleaner.column_type_detector import DATETIME, NUMBER_TYPES, REGEX_NUMBER
from mage_ai.data_cleaner.transformer_actions.action_code import query_with_action_code
from mage_ai.data_cleaner.transformer_actions.constants import (
    CONSTANT_IMPUTATION_DEFAULTS,
    CURRENCY_SYMBOLS,
    ImputationStrategy,
    NameConventionPatterns,
)
from mage_ai.data_cleaner.transformer_actions.custom_action import execute_custom_action
from mage_ai.data_cleaner.transformer_actions.helpers import (
    convert_col_type,
    get_column_type,
    get_time_window_str,
)
from mage_ai.data_cleaner.transformer_actions.udf.base import execute_udf
from mage_ai.data_cleaner.transformer_actions.utils import generate_string_cols
from keyword import iskeyword
import pandas as pd
import numpy as np


def add_column(df, action, **kwargs):
    col = action['outputs'][0]['uuid']
    col_type = action['outputs'][0]['column_type']
    udf = action['action_options'].get('udf')
    if udf is None:
        return df
    df_copy = df.copy()
    df_copy[col] = execute_udf(
        udf,
        df,
        action.get('action_arguments'),
        action.get('action_code'),
        action.get('action_options'),
        kwargs,
    )
    df_copy[col] = convert_col_type(df_copy[col], col_type)
    return df_copy


def average(df, action, **kwargs):
    return __agg(df, action, 'mean')


def count(df, action, **kwargs):
    return __groupby_agg(df, action, 'count')


def count_distinct(df, action, **kwargs):
    return __groupby_agg(df, action, 'nunique')


def clean_column_names(df, action, **kwargs):
    columns = action['action_arguments']
    mapping = {col: __clean_column_name(col) for col in columns}
    return df.rename(columns=mapping)


def custom(df, action, **kwargs):
    return execute_custom_action(df, action, **kwargs)


def diff(df, action, **kwargs):
    output_col = action['outputs'][0]['uuid']
    df[output_col] = df[action['action_arguments'][0]].diff()
    return df


def first(df, action, **kwargs):
    return __agg(df, action, 'first')


def impute(df, action, **kwargs):
    action_variables = action['action_variables']
    columns = action['action_arguments']
    action_options = action['action_options']
    strategy = action_options.get('strategy')
    value = action_options.get('value')

    empty_string_pattern = r'^\s*$'
    df[columns] = df[columns].replace(empty_string_pattern, np.nan, regex=True)

    if strategy == ImputationStrategy.AVERAGE:
        df[columns] = df[columns].fillna(df[columns].astype(float).mean(axis=0))
    elif strategy == ImputationStrategy.CONSTANT:
        if value is None:
            col_by_type = {}
            for column in columns:
                dtype = action_variables[column]['feature']['column_type']
                key = 'object'
                if dtype == DATETIME:
                    key = 'datetime'
                elif dtype in NUMBER_TYPES:
                    key = 'number'
                col_by_type.setdefault(key, []).append(column)
            for key, column_set in col_by_type.items():
                df[column_set] = df[column_set].fillna(CONSTANT_IMPUTATION_DEFAULTS[key])
        else:
            df[columns] = df[columns].fillna(value)
    elif strategy == ImputationStrategy.MEDIAN:
        df[columns] = df[columns].fillna(df[columns].astype(float).median(axis=0))
    elif strategy == ImputationStrategy.MODE:
        df[columns] = df[columns].fillna(df[columns].mode(axis=0).iloc[0])
    elif strategy == ImputationStrategy.COLUMN:
        replacement_df = pd.DataFrame({col: df[value] for col in columns})
        df[columns] = df[columns].fillna(replacement_df)
    elif strategy == ImputationStrategy.SEQ:
        timeseries_cols = action_options.get('timeseries_index')
        df = df.sort_values(by=timeseries_cols, axis=0)
        df[columns] = df[columns].fillna(method='ffill')
    elif strategy == ImputationStrategy.RANDOM:
        for column in columns:
            invalid_idx = df[df[column].isna()].index
            valid_idx = df[df[column].notna()].index
            if len(invalid_idx) == len(df[column]):
                raise Exception(
                    f'Random impute has no values to sample from in column \'{column}\''
                )
            sample = df.loc[valid_idx, column].sample(len(invalid_idx), replace=True)
            sample.index = invalid_idx
            df.loc[invalid_idx, column] = sample
    elif value is not None:
        df[columns] = df[columns].fillna(value)
    else:
        raise Exception('Require a valid strategy or value')

    for col in columns:
        col_type = get_column_type(col, action)
        df[col] = convert_col_type(df[col], col_type)
    return df


def max(df, action, **kwargs):
    return __agg(df, action, 'max')


def median(df, action, **kwargs):
    return __agg(df, action, 'median')


def min(df, action, **kwargs):
    return __agg(df, action, 'min')


def reformat(df, action, **kwargs):
    columns = action['action_arguments']
    options = action['action_options']
    reformat_action = options['reformat']
    df.loc[:, columns] = df[columns].replace('^\s*$', np.nan, regex=True)

    if reformat_action == 'caps_standardization':
        capitalization = options['capitalization']
        for column in generate_string_cols(df, columns):
            if capitalization == 'uppercase':
                df.loc[:, column] = df[columns][column].str.upper()
            else:
                df.loc[:, column] = df[columns][column].str.lower()
    elif reformat_action == 'currency_to_num':
        for column in generate_string_cols(df, columns):
            clean_col = df[column].replace(CURRENCY_SYMBOLS, '', regex=True)
            clean_col = clean_col.replace('\s', '', regex=True)
            clean_col = clean_col.replace('^\s*$', np.nan, regex=True)
            try:
                df.loc[:, column] = clean_col.astype(float)
            except ValueError:
                print(
                    f'Currency conversion applied on non-numerical column \'{column}\''
                    ': no action taken'
                )
    elif reformat_action == 'date_format_conversion':
        for column in columns:
            clean_col = df[column]
            dropped = clean_col.dropna(axis=0)
            exact_dtype = type(dropped.iloc[0]) if len(dropped) > 0 else None
            if exact_dtype is str:
                clean_col = clean_col.str.replace(r'[\,\s\t]+', ' ')
                clean_col = clean_col.str.replace(
                    r'\s*([\/\\\-\.]+)\s*', lambda group: group.group(1)[0]
                )
                clean_col = clean_col.str.lower()
            df.loc[:, column] = pd.to_datetime(
                clean_col, infer_datetime_format=True, errors='coerce'
            )

    return df


def remove_column(df, action, **kwargs):
    cols = action['action_arguments']
    original_columns = df.columns
    drop_columns = [col for col in cols if col in original_columns]

    return df.drop(columns=drop_columns)


def last(df, action, **kwargs):
    return __agg(df, action, 'last')


def select(df, action, **kwargs):
    return df[action['action_arguments']]


def shift_down(df, action, **kwargs):
    output_col = action['outputs'][0]['uuid']
    action_options = action.get('action_options', {})
    groupby_columns = action_options.get('groupby_columns')
    periods = action_options.get('periods', 1)
    if groupby_columns is not None:
        df[output_col] = df.groupby(groupby_columns)[action['action_arguments'][0]].shift(periods)
    else:
        df[output_col] = df[action['action_arguments'][0]].shift(periods)
    return df


def shift_up(df, action, **kwargs):
    output_col = action['outputs'][0]['uuid']
    df[output_col] = df[action['action_arguments'][0]].shift(-1)
    return df


def sum(df, action, **kwargs):
    return __agg(df, action, 'sum')


def __agg(df, action, agg_method):
    if action['action_options'].get('groupby_columns'):
        return __groupby_agg(df, action, agg_method)
    else:
        output_col = action['outputs'][0]['uuid']
        df[output_col] = df[action['action_arguments'][0]].agg(agg_method)
        return df


def __column_mapping(action):
    return dict(zip(action['action_arguments'], [o['uuid'] for o in action['outputs']]))


def __clean_column_name(name):
    if iskeyword(name):
        name = f'{name}_'
    name = name.strip(' \'\"_-')
    name = NameConventionPatterns.CONNECTORS.sub('_', name)
    name = NameConventionPatterns.NON_ALNUM.sub('', name)
    name = REGEX_NUMBER.sub(lambda number: f'number_{number.group(0)}', name)
    if iskeyword(name):
        name = f'{name}_'
    uppercase_group = NameConventionPatterns.UPPERCASE.match(name)
    pascal_group = NameConventionPatterns.PASCAL.match(name)
    camel_group = NameConventionPatterns.CAMEL.match(name)
    if uppercase_group:
        name = name.lower()
    elif pascal_group:
        components = NameConventionPatterns.PASCAL_COMPONENT.findall(name)
        name = '_'.join(components)
    elif camel_group:
        components = NameConventionPatterns.CAMEL_COMPONENT.findall(name)
        components += NameConventionPatterns.PASCAL_COMPONENT.findall(name)
        name = '_'.join(components)
    return name.lower()


# Filter by timestamp_feature_a - window <= timestamp_feature_b <= timestamp_feature_a
def __filter_df_with_time_window(df, action):
    action_options = action['action_options']
    time_window_keys = ['timestamp_feature_a', 'timestamp_feature_b', 'window']
    if all(k in action_options for k in time_window_keys):
        window_in_seconds = action_options['window']
        df_time_diff = (
            pd.to_datetime(df[action_options['timestamp_feature_a']], utc=True)
            - pd.to_datetime(df[action_options['timestamp_feature_b']], utc=True)
        ).dt.total_seconds()
        if window_in_seconds > 0:
            df_time_diff_filtered = df_time_diff[
                (df_time_diff <= window_in_seconds) & (df_time_diff >= 0)
            ]
        else:
            df_time_diff_filtered = df_time_diff[
                (df_time_diff >= window_in_seconds) & (df_time_diff <= 0)
            ]
        df_filtered = df.loc[df_time_diff_filtered.index]
        time_window = get_time_window_str(window_in_seconds)
    else:
        df_filtered = df
        time_window = None
    return df_filtered, time_window


def __groupby_agg(df, action, agg_method):
    df_filtered, _ = __filter_df_with_time_window(df, action)
    action_code = action.get('action_code')
    if action_code is not None and action_code != '':
        df_filtered = query_with_action_code(df_filtered, action_code, {'original_df': df_filtered})
    action_options = action['action_options']
    df_agg = df_filtered.groupby(action_options['groupby_columns'],)[
        action['action_arguments']
    ].agg(agg_method)
    return df.merge(
        df_agg.rename(columns=__column_mapping(action)),
        on=action_options['groupby_columns'],
        how='left',
    )
