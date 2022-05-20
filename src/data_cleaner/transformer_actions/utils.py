from data_cleaner.transformer_actions.constants import ActionType, Axis


def columns_to_remove(transformer_actions):
    arr = filter(
        lambda x: x['action_type'] == ActionType.REMOVE and x['axis'] == Axis.COLUMN,
        transformer_actions,
    )

    columns = []
    for transformer_action in arr:
        columns += transformer_action['action_arguments']

    return columns
