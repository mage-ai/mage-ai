{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.REMOVE

    Docs: https://docs.mage.ai/guides/transformer-blocks#remove-columns
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.REMOVE,
        arguments=[],  # Specify columns to remove
        axis=Axis.COLUMN,
    )
{% endblock %}
