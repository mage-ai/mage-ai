{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.FILTER
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.FILTER,
        axis=Axis.ROW,
        action_code='',  # Specify your filtering code here
    )
{% endblock %}
