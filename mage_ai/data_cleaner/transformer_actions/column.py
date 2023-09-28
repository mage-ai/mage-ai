from mage_ai.data_cleaner.column_types.column_type_detector import find_syntax_errors
from mage_ai.data_cleaner.column_types.constants import NUMBER_TYPES, ColumnType
from mage_ai.data_cleaner.estimators.outlier_removal import OutlierRemover
from mage_ai.data_cleaner.transformer_actions.action_code import query_with_action_code
from mage_ai.data_cleaner.transformer_actions.constants import (
    CONSTANT_IMPUTATION_DEFAULTS,
    CURRENCY_SYMBOLS,
    INVALID_VALUE_PLACEHOLDERS,
    ImputationStrategy,
)
from mage_ai.data_cleaner.transformer_actions.custom_action import execute_custom_action
from mage_ai.data_cleaner.transformer_actions.helpers import (
    convert_col_type,
    get_column_type,
    get_time_window_str,
)
from mage_ai.data_cleaner.transformer_actions.udf.base import execute_udf
from mage_ai.data_cleaner.transformer_actions.utils import clean_column_name, generate_string_cols
import logging
import pandas as pd
import numpy as np


logger = logging.getLogger(__name__)


def add_column(df, action, **kwargs):
    col = action['outputs'][0]['uuid']
    col_type = action['outputs'][0]['column_type']
    udf = action['action_options'].get('udf')
    if udf is None:
        return df
    if len(action['action_arguments']) == 0:
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
    mapping = {col: clean_column_name(col) for col in columns}
    return df.rename(columns=mapping)


def custom(df, action, **kwargs):
    return execute_custom_action(df, action, **kwargs)


def diff(df, action, **kwargs):
    if len(action['action_arguments']) == 0:
        return df
    output_col = action['outputs'][0]['uuid']
    df[output_col] = df[action['action_arguments'][0]].diff()
    return df


def first(df, action, **kwargs):
    return __agg(df, action, 'first')


def fix_syntax_errors(df, action, **kwargs):
    action_variables = action['action_variables']
    columns = action['action_arguments']
    for column in generate_string_cols(df, columns):
        dtype = action_variables[column]['feature']['column_type']
        mask = find_syntax_errors(df[column], dtype)
        df.loc[mask, column] = INVALID_VALUE_PLACEHOLDERS[dtype]
    return df


def impute(df, action, **kwargs):
    action_variables = action['action_variables']
    columns = action['action_arguments']
    action_options = action['action_options']
    strategy = action_options.get('strategy')
    value = action_options.get('value')

    empty_string_pattern = r'^\s*$'
    df[columns] = df[columns].replace(empty_string_pattern, np.nan, regex=True)
    ctypes = [action_variables[column]['feature']['column_type'] for column in columns]

    if strategy == ImputationStrategy.AVERAGE:
        df[columns] = df[columns].fillna(df[columns].astype(float).mean(axis=0))
    elif strategy == ImputationStrategy.CONSTANT:
        if value is None:
            value = pd.Series([CONSTANT_IMPUTATION_DEFAULTS[dtype] for dtype in ctypes])
            value.index = pd.Index(columns)
        df[columns] = df[columns].fillna(value)
    elif strategy == ImputationStrategy.MEDIAN:
        df[columns] = df[columns].fillna(df[columns].astype(float).median(axis=0))
    elif strategy == ImputationStrategy.MODE:
        if ColumnType.LIST in ctypes:
            for column, dtype in zip(columns, ctypes):
                mode = df[column].mode().iloc[0]
                if dtype == ColumnType.LIST:
                    df[column] = df[column].apply(
                        lambda element: element if element not in [None, np.nan] else mode
                    )
                else:
                    df[columns] = df[columns].fillna(mode)
        else:
            df[columns] = df[columns].fillna(df[columns].mode(axis=0).iloc[0])
    elif strategy == ImputationStrategy.COLUMN:
        replacement_df = pd.DataFrame({col: df[value] for col in columns})
        df[columns] = df[columns].fillna(replacement_df)
    elif strategy == ImputationStrategy.SEQ:
        timeseries_cols = action_options.get('timeseries_index')
        df = df.sort_values(by=timeseries_cols, axis=0)
        df[columns] = df[columns].fillna(method='ffill')
    elif strategy == ImputationStrategy.RANDOM:
        for column, dtype in zip(columns, ctypes):
            invalid_idx = df[df[column].isna()].index
            valid_idx = df[df[column].notna()].index
            if len(invalid_idx) == len(df[column]):
                raise Exception(
                    f'Random impute has no values to sample from in column \'{column}\''
                )
            sample = df.loc[valid_idx, column].sample(len(invalid_idx), replace=True)
            sample.index = invalid_idx
            if dtype == ColumnType.LIST:
                for idx, sample_value in zip(invalid_idx, sample):
                    df.at[idx, column] = sample_value
            else:
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


def normalize(df, action, **kwargs):
    columns = action['action_arguments']
    for col in columns:
        data_min = np.nanmin(df[col], axis=0)
        data_max = np.nanmax(df[col], axis=0)
        data_range = data_max - data_min
        df[col] = (df[col] - data_min) / data_range
    return df


def reformat(df, action, **kwargs):
    columns = action['action_arguments']
    options = action['action_options']
    reformat_action = options['reformat']
    df.loc[:, columns] = df[columns].replace(r'^\s*$', np.nan, regex=True)

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
            clean_col = clean_col.replace(r'\s', '', regex=True)
            clean_col = clean_col.replace(r'^\s*$', np.nan, regex=True)
            try:
                df.loc[:, column] = clean_col.astype(float)
            except ValueError:
                logger.warn(
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


def remove_outliers(df, action, **kwargs):
    cols = set(action['action_arguments'])
    numeric_df = df[cols].copy()
    for column in numeric_df.columns:
        dtype = action['action_variables'][column]['feature']['column_type']
        if dtype in NUMBER_TYPES:
            numeric_df.loc[:, column] = numeric_df.loc[:, column].astype(float)
        else:
            numeric_df.drop(column, axis=1, inplace=True)
    outlier_mask = numeric_df.notna().all(axis=1)
    numeric_df = numeric_df.dropna(axis=0)
    if numeric_df.size == 0:
        return df

    method = action['action_options']['method']
    remover = OutlierRemover(method=method)
    notna_outlier_mask = remover.fit_transform(numeric_df.to_numpy())
    # This code maps the outlier mask on a subset of data back to the mask on the entire data
    notna_outlier_mask = pd.Series(notna_outlier_mask, dtype='bool')
    notna_outlier_mask.index = outlier_mask[outlier_mask].index
    outlier_mask[outlier_mask] = notna_outlier_mask
    outlier_mask = outlier_mask.astype(bool)
    return df[~outlier_mask]


def last(df, action, **kwargs):
    return __agg(df, action, 'last')


def select(df, action, **kwargs):
    return df[action['action_arguments']]


def shift_down(df, action, **kwargs):
    if len(action['action_arguments']) == 0:
        return df

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
    if len(action['action_arguments']) == 0:
        return df
    output_col = action['outputs'][0]['uuid']
    df[output_col] = df[action['action_arguments'][0]].shift(-1)
    return df


def standardize(df, action, **kwargs):
    columns = action['action_arguments']
    for col in columns:
        data_mean = np.mean(df[col], axis=0)
        data_std = np.std(df[col], axis=0)
        df[col] = (df[col] - data_mean) / data_std
    return df


def sum(df, action, **kwargs):
    return __agg(df, action, 'sum')


def __agg(df, action, agg_method):
    if len(action['action_arguments']) == 0:
        return df

    if action['action_options'].get('groupby_columns'):
        return __groupby_agg(df, action, agg_method)
    else:
        output_col = action['outputs'][0]['uuid']
        df[output_col] = df[action['action_arguments'][0]].agg(agg_method)
        return df


def __column_mapping(action):
    return dict(zip(action['action_arguments'], [o['uuid'] for o in action['outputs']]))


# Filter by timestamp_feature_a - window <= timestamp_feature_b <= timestamp_feature_a
def __filter_df_with_time_window(df, action):
    if len(action['action_arguments']) == 0:
        return df

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
    if len(action['action_arguments']) == 0:
        return df

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
