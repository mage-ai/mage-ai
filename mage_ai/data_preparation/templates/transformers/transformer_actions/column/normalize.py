{% extends "transformers/transformer_actions/action.jinja" %}
{% block imports %}
{{ super() -}}
{% endblock %}
{% block action %}
    """
    Execute Transformer Action: ActionType.NORMALIZE

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#normalize-data
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.NORMALIZE,
        arguments=[],  # Specify columns to normalize
        axis=Axis.COLUMN,
    )
{% endblock %}
