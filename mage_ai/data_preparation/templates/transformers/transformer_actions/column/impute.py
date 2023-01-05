{% extends "transformers/transformer_actions/action.jinja" %}
{% block imports %}
from mage_ai.data_cleaner.transformer_actions.constants import ImputationStrategy
{{ super() -}}
{% endblock %}
{% block action %}
    """
    Execute Transformer Action: ActionType.IMPUTE

    Docs: https://docs.mage.ai/guides/transformer-blocks#fill-in-missing-values
    """
    action = build_transformer_action(
        df,
        action_type=ActionType.IMPUTE,
        arguments=df.columns,  # Specify columns to impute
        axis=Axis.COLUMN,
        options={'strategy': ImputationStrategy.CONSTANT},  # Specify imputation strategy
    )
{% endblock %}
