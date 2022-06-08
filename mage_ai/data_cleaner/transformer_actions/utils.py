from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis


def columns_to_remove(transformer_actions):
    arr = filter(
        lambda x: x['action_type'] == ActionType.REMOVE and x['axis'] == Axis.COLUMN,
        transformer_actions,
    )

    columns = []
    for transformer_action in arr:
        columns += transformer_action['action_arguments']

    return columns


def generate_action_titles(transformer_actions):
    for a in transformer_actions:
        if not a.get('title'):
            a['title'] = generate_action_title(a)
    return transformer_actions


def generate_action_title(action):
    payload = action['action_payload']
    action_type = payload['action_type']
    title = ''
    if action_type == ActionType.REMOVE:
        title = 'Remove columns'
    elif action_type == ActionType.FILTER:
        title = 'Filter rows'
    elif action_type == ActionType.DROP_DUPLICATE:
        title = 'Drop duplicate rows'
    elif action_type == ActionType.REFORMAT:
        title = 'Reformat values'
    elif action_type == ActionType.IMPUTE:
        title = 'Fill in missing values'
    elif action_type == ActionType.CLEAN_COLUMN_NAME:
        title = 'Clean dirty column names'
    return title


def generate_string_cols(df, columns):
    for column in columns:
        clean_col = df[column]
        dropped = clean_col.dropna(axis=0)
        exact_dtype = type(dropped.iloc[0]) if len(dropped) > 0 else None
        if exact_dtype is str:
            yield column
        else:
            print(f'Attempted to perform string-only action on non-string column \'{column}\'')
