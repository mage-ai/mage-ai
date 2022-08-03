{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.REMOVE

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#remove-columns
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.REMOVE,
        arguments=[],  # Specify columns to remove
        axis=Axis.COLUMN,
    )
{% endblock %}
