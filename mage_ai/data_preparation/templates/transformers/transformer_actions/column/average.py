{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.AVERAGE

    Docs: https://docs.mage.ai/guides/transformer-blocks#aggregation-actions
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.AVERAGE,
        action_code='',  # Enter filtering condition on rows before aggregation
        arguments=[],  # Enter the columns to compute aggregate over
        axis=Axis.COLUMN,
        options={'groupby_columns': []},  # Enter columns to group by
        outputs=[
            # The number of outputs below must match the number of arguments
            {'uuid': 'new_aggregate_column', 'column_type': 'number_with_decimals'},
        ],
    )
{% endblock %}
