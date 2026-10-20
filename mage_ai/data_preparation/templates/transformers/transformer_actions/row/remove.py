{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.REMOVE

    Docs: https://docs.mage.ai/guides/transformer-blocks#remove-rows
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.REMOVE,
        axis=Axis.ROW,
        options={'rows': []},  # Specify indices of rows to remove
    )
{% endblock %}
