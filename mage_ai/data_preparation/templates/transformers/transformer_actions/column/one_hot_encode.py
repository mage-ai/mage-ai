{% extends "transformers/transformer_actions/action.jinja" %}
{% block imports %}
{{ super() -}}
{% endblock %}
{% block action %}
    """
    Execute Transformer Action: ActionType.ONE_HOT_ENCODE

    Docs: https://docs.mage.ai/guides/blocks/transformer-blocks#one-hot-encode
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.ONE_HOT_ENCODE,
        arguments=[],  # Required: specify columns to encode, e.g. ['color', 'size']
        axis=Axis.COLUMN,
    )
{% endblock %}
