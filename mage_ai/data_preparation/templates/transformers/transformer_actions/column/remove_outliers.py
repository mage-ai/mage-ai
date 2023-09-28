{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.REMOVE_OUTLIERS

    Warning: This method uses relative outlier checks, and so repeated executions of this
    transformer action will continue to remove data.

    Docs: https://docs.mage.ai/guides/transformer-blocks#remove-outliers
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.REMOVE_OUTLIERS,
        arguments=df.columns,  # Specify columns to remove outliers from
        axis=Axis.COLUMN,
        options={'method': 'auto'},  # Specify algorithm to use for outlier removal
    )
{% endblock %}
