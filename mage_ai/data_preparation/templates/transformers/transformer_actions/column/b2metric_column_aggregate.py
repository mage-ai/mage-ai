{% extends "transformers/transformer_actions/action.jinja" %}
{% block action %}
    """
    Execute Transformer Action: ActionType.YENİ_AKSİYON

    Açıklama buraya.
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.AVERAGE,  # Uygun ActionType ile değiştir
        action_code='',
        arguments=[],  # Aggregate yapılacak sütunlar
        axis=Axis.COLUMN,
        options={'groupby_columns': []},  # Group by sütunları
        outputs=[
            {'uuid': 'b2metric_column_aggregate', 'column_type': 'number_with_decimals'},
        ],
    )
{% endblock %}