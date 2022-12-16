{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.SELECT

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#select-columns
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.SELECT,
        arguments=df.columns,  # Specify columns to select
        axis=Axis.COLUMN,
    )
{% endblock %}
