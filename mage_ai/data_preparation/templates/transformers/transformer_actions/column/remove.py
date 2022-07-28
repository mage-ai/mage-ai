{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.REMOVE
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.REMOVE,
        arguments=[],  # Specify columns to remove
        axis=Axis.COLUMN,
    )
{% endblock %}
