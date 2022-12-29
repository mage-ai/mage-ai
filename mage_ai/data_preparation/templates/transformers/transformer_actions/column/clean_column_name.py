{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.CLEAN_COLUMN_NAME

    Docs: https://docs.mage.ai/guides/transformer-blocks#clean-column-names
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.CLEAN_COLUMN_NAME,
        arguments=df.columns,
        axis=Axis.COLUMN,
    )
{% endblock %}
