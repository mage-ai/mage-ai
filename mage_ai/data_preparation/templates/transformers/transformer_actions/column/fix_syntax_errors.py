{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.FIX_SYNTAX_ERRORS

    This marks any improperly formatted values in each column specified
    as invalid.

    Docs: https://docs.mage.ai/guides/transformer-blocks#fix-syntax-errors
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.FIX_SYNTAX_ERRORS,
        arguments=df.columns,  # Specify columns to fix syntax errors for.
        axis=Axis.COLUMN,
    )
{% endblock %}
