from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.data_cleaner.shared.utils import parse_list
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, VariableType
import numpy as np

DAY_SECONDS = 86400
HOUR_SECONDS = 3600


def convert_col_type(df_col, col_type):
    if col_type == ColumnType.NUMBER:
        return df_col.replace(r'^\s*$', 0, regex=True).fillna(0).astype(np.int64)
    elif col_type == ColumnType.NUMBER_WITH_DECIMALS:
        return df_col.dropna().astype(float)
    elif col_type == ColumnType.TEXT:
        return df_col.dropna().astype(str)
    elif col_type == ColumnType.LIST:
        return df_col.apply(parse_list)
    return df_col


def convert_value_type(feature_uuid, action, value):
    action_variables = action.get('action_variables', {})
    column_type = None
    for v in action_variables.values():
        if v['type'] == 'feature' and v['feature']['uuid'] == feature_uuid:
            column_type = v['feature']['column_type']
            break
    if column_type == ColumnType.NUMBER:
        value = int(value)
    elif column_type == ColumnType.NUMBER_WITH_DECIMALS:
        value = float(value)
    return value


def drop_na(df):
    return df.replace(r'^\s*$', np.nan, regex=True).dropna()


def extract_join_feature_set_version_id(payload):
    if payload['action_type'] != ActionType.JOIN:
        return None
    join_feature_set_version_id = payload['action_arguments'][0]
    if type(join_feature_set_version_id) == str and join_feature_set_version_id.startswith('%{'):

        join_feature_set_version_id = next(
            v['id']
            for v in payload['action_variables'].values()
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
