{% extends "transformers/transformer_actions/action.jinja" %}
{% block imports %}
{{ super() -}}
{% endblock %}
{% block action %}
    """
    Execute Transformer Action: ActionType.STANDARDIZE

    Docs: https://docs.mage.ai/guides/transformer-blocks#standardize-data
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.STANDARDIZE,
        arguments=[],  # Specify columns to normalize
        axis=Axis.COLUMN, # Specify normalization strategy
    )
{% endblock %}
