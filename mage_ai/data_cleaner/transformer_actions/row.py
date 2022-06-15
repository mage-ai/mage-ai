from mage_ai.data_cleaner.column_types.constants import NUMBER_TYPES
from mage_ai.data_cleaner.transformer_actions.action_code import query_with_action_code
from mage_ai.data_cleaner.transformer_actions.constants import VariableType
from mage_ai.data_cleaner.transformer_actions.custom_action import execute_custom_action
import pandas as pd


def custom(df, action, **kwargs):
    return execute_custom_action(df, action, **kwargs)


def drop_duplicates(df, action, **kwargs):
    keep = action.get('action_options', {}).get('keep', 'last')
    action_args = dict(keep=keep)
    subset_cols = action.get('action_arguments')
    if subset_cols is not None and len(subset_cols) > 0:
        action_args['subset'] = subset_cols
    return df.drop_duplicates(**action_args)


def filter_rows(df, action, **kwargs):
    """
    df:
        Pandas DataFrame
    action:
        TransformerAction serialized into a dictionary
    """
    action_code = action['action_code']

    return query_with_action_code(df, action_code, kwargs)


def sort_rows(df, action, **kwargs):
    ascending = action.get('action_options', {}).get('ascending', True)
    ascendings = action.get('action_options', {}).get('ascendings', [])
    if len(ascendings) > 0:
        ascending = ascendings[0]

    feature_by_uuid = {}
    if action.get('action_variables'):
        for _, val in action['action_variables'].items():
            feature = val.get('feature')
            if feature:
                feature_by_uuid[feature['uuid']] = feature

    na_indexes = None
    as_types = {}

    for idx, uuid in enumerate(action['action_arguments']):
        feature = feature_by_uuid.get(uuid)
        if feature and feature['column_type'] in NUMBER_TYPES:
            as_types[uuid] = float
            if idx == 0:
                na_indexes = df[(df[uuid].isnull()) | (df[uuid].astype(str).str.len() == 0)].index

    bad_df = None
    if na_indexes is not None:
        bad_df = df.index.isin(na_indexes)

    index = (
        (df[~bad_df] if bad_df is not None else df)
        .astype(as_types)
        .sort_values(
            by=action['action_arguments'],
            ascending=ascendings if len(ascendings) > 0 else ascending,
        )
        .index
    )

    df_final = df.loc[index]
    if bad_df is not None:
        if ascending:
            return pd.concat(
                [
                    df.iloc[bad_df],
                    df_final,
                ]
            )

        return pd.concat(
            [
                df_final,
                df.iloc[bad_df],
            ]
        )

    return df_final


def remove_row(df, action, **kwargs):
    row_indices = action['action_options']['rows']
    row_indices = [index for index in row_indices if index in df.index]
    return df.drop(row_indices, axis=0)
