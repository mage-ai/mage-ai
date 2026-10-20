{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.SHIFT_UP

    Shifts value in the selected column down by specified number periods.

    Docs: https://docs.mage.ai/guides/transformer-blocks#shift-up
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.SHIFT_UP,
        arguments=[],  # Specify one column to perform shift on
        axis=Axis.COLUMN,
        outputs=[{'uuid': 'up_shifted_column_1', 'type': 'category'}],
    )
{% endblock %}
