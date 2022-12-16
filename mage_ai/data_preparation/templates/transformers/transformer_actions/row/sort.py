{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.SORT

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#sort
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.SORT,
        arguments=[],  # Specify columns to sort rows by
        axis=Axis.ROW,
        options={'ascending': True},
    )
{% endblock %}
