{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.REFORMAT

    Docs: https://docs.mage.ai/guides/transformer-blocks#reformat-values
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.REFORMAT,
        arguments=[],  # Specify columns to reformat
        axis=Axis.COLUMN,
        options={'reformat': None},  # Specify reformat action,
    )
{% endblock %}
