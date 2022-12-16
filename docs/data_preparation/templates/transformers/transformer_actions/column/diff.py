{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.DIFF

    Calculates difference from previous row along column.

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#difference
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.DIFF,
        arguments=[],  # Specify at most one column to compute difference with
        axis=Axis.COLUMN,
        outputs=[{'uuid': 'new_diff_column', 'column_type': 'number_with_decimals'}],
    )
{% endblock %}
