{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.REFORMAT

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#reformat-values
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.REFORMAT,
        arguments=[],  # Specify columns to reformat
        axis=Axis.COLUMN,
        options={'reformat': None},  # Specify reformat action,
    )
{% endblock %}
