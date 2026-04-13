{% extends "transformers/transformer_actions/action.jinja" %}
{% block imports %}
{{ super() -}}
{% endblock %}
{% block action %}
    """
    Execute Transformer Action: ActionType.NORMALIZE

    """
    action = build_transformer_action(
        df,
        action_type=ActionType.NORMALIZE,
        arguments=[],  # Specify columns to normalize
        axis=Axis.COLUMN,
    )
{% endblock %}
