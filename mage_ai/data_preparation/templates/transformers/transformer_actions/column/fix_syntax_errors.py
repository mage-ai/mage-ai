{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.FIX_SYNTAX_ERRORS

    This marks any improperly formatted values in each column specified
    as invalid.

    Docs: https://github.com/mage-ai/mage-ai/blob/master/docs/actions/transformer_actions/README.md#fix-syntax-errors
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.FIX_SYNTAX_ERRORS,
        arguments=df.columns,  # Specify columns to fix syntax errors for.
        axis=Axis.COLUMN,
    )
{% endblock %}
