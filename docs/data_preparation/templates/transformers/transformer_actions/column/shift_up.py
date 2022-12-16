{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.SHIFT_UP

    Shifts value in the selected column down by specified number periods.

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#shift-up
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.SHIFT_UP,
        arguments=[],  # Specify one column to perform shift on
        axis=Axis.COLUMN,
        outputs=[{'uuid': 'up_shifted_column_1', 'type': 'category'}],
    )
{% endblock %}
