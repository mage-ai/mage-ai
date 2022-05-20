from data_cleaner.column_type_detector import NUMBER, NUMBER_WITH_DECIMALS, TEXT
from data_cleaner.transformer_actions.constants import ActionType, Operator, VariableType
import numpy as np
import re

DAY_SECONDS = 86400
HOUR_SECONDS = 3600


def convert_col_type(df_col, col_type):
    if col_type == NUMBER:
        return df_col.replace(r'^\s*$', 0, regex=True).fillna(0).astype(np.int64)
    elif col_type == NUMBER_WITH_DECIMALS:
        return df_col.dropna().astype(float)
    elif col_type == TEXT:
        return df_col.dropna().astype(str)
    return df_col


def convert_value_type(feature_uuid, action, value):
    action_variables = action.get('action_variables', {})
    column_type = None
    for v in action_variables.values():
        if v['type'] == 'feature' and v['feature']['uuid'] == feature_uuid:
            column_type = v['feature']['column_type']
            break
    if column_type == NUMBER:
        value = int(value)
    elif column_type == NUMBER_WITH_DECIMALS:
        value = float(value)
    return value


def drop_na(df):
    return df.replace(r'^\s*$', np.nan, regex=True).dropna()


def extract_join_feature_set_version_id(payload):
    if payload['action_type'] != ActionType.JOIN:
        return None
    join_feature_set_version_id = payload['action_arguments'][0]
    if type(join_feature_set_version_id) == str and \
       join_feature_set_version_id.startswith('%{'):

        join_feature_set_version_id = next(
            v['id'] for v in payload['action_variables'].values()
            if v['type'] == VariableType.FEATURE_SET_VERSION
        )
    return join_feature_set_version_id


def get_column_type(feature_uuid, action):
    action_variables = action.get('action_variables', {})
    column_type = None
    for v in action_variables.values():
        if v['type'] == 'feature' and v['feature']['uuid'] == feature_uuid:
            column_type = v['feature']['column_type']
            break
    return column_type


def get_time_window_str(window_in_seconds):
    if window_in_seconds is None:
        return None
    if window_in_seconds >= DAY_SECONDS:
        time_window = f'{int(window_in_seconds / DAY_SECONDS)}d'
    elif window_in_seconds >= HOUR_SECONDS:
        time_window = f'{int(window_in_seconds / HOUR_SECONDS)}h'
    else:
        time_window = f'{window_in_seconds}s'
    return time_window


def query_with_action_code(df, action_code, kwargs):
    match = re.search(r'^[\w.]+\s{1}', action_code)
    if match:
        column_name = match[0].strip()
    else:
        column_name = None

    original_df = df
    if original_df is not None and column_name:
        dropped_na = original_df[column_name].dropna()
        is_bool = len(dropped_na.index) >= 1 and type(dropped_na.iloc[0]) is bool
        is_string = original_df[column_name].dtype == 'object' and not is_bool

        if f'{column_name} {Operator.NOT_EQUALS} null' == action_code:
            if is_string:
                return original_df[~original_df[column_name].isnull() & (original_df[column_name].str.len() >= 1)]
            elif is_bool:
                return original_df[~original_df[column_name].isnull() & (original_df[column_name] != '')]
            else:
                return original_df[~original_df[column_name].isnull()]
        elif f'{column_name} {Operator.EQUALS} null' == action_code:
            if is_string or is_bool:
                return original_df[original_df[column_name].isnull() | (original_df[column_name].str.len() == 0)]
            else:
                return original_df[original_df[column_name].isnull()]
        elif action_code.startswith(f'{column_name} {Operator.CONTAINS}'):
            if is_string:
                value = action_code.split(' ')[2].strip('"')
                return original_df[(original_df[column_name].notna()) & (original_df[column_name].str.contains(value))]
            raise Exception('"contrains" operator can only be used for string columns.')

    return df.query(action_code)
