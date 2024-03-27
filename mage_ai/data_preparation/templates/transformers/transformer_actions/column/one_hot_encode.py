{% extends "transformers/transformer_actions/action.jinja" %}
{% block imports %}
{{ super() -}}
{% endblock %}
{% block action %}
    """
    Execute Transformer Action: ActionType.ONE_HOT_ENCODE

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#one-hot-encode
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.ONE_HOT_ENCODE,
        arguments=[],  # Specify columns to normalize
        axis=Axis.COLUMN,
        
    )
{% endblock %}
