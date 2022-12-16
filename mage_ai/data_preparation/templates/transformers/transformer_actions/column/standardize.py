{% extends "transformers/transformer_actions/action.jinja" %}
{% block imports %}
{{ super() -}}
{% endblock %}
{% block action %}
    """
    Execute Transformer Action: ActionType.STANDARDIZE

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#standardize-data
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.STANDARDIZE,
        arguments=[],  # Specify columns to normalize
        axis=Axis.COLUMN, # Specify normalization strategy
    )
{% endblock %}
