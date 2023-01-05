{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.DROP_DUPLICATE

    Docs: https://docs.mage.ai/guides/transformer-blocks#drop-duplicates
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.DROP_DUPLICATE,
        arguments=df.columns,  # Specify columns to use when comparing duplicates
        axis=Axis.ROW,
        options={'keep': 'first'},  # Specify whether to keep 'first' or 'last' duplicate
    )
{% endblock %}
