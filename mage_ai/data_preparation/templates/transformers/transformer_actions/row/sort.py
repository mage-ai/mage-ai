{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.SORT

    Docs: https://docs.mage.ai/guides/transformer-blocks#sort
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.SORT,
        arguments=[],  # Specify columns to sort rows by
        axis=Axis.ROW,
        options={'ascending': True},
    )
{% endblock %}
