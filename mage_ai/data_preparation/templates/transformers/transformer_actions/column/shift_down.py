{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.SHIFT_DOWN

    Shifts value in the selected column down by specified number periods.

    Docs: https://docs.mage.ai/guides/transformer-blocks#shift-down
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.SHIFT_DOWN,
        arguments=[],  # Specify one column to perform shift on
        axis=Axis.COLUMN,
        options={'periods': 1},
        outputs=[{'uuid': 'down_shifted_column_1', 'type': 'category'}],
    )
{% endblock %}
