class BaseRule:
    def __init__(self, df, column_types, statistics):
        self.df = df
        self.df_columns = df.columns.tolist()
        self.column_types = column_types
        self.statistics = statistics

    def evaluate(self):
        """Evaluate data cleaning rule and generate suggested actions
        Returns
        -------
        A list of suggested actions
        """
        return []

    def _build_transformer_action_suggestion(
        self,
        title,
        message,
        action_type,
        action_arguments=[],
        action_code='',
        action_options={},
        action_variables={},
        axis='column',
        outputs=[],
    ):
        return dict(
            title=title,
            message=message,
            action_payload=dict(
                action_type=action_type,
                action_arguments=action_arguments,
                action_code=action_code,
                action_options=action_options,
                action_variables=action_variables,
                axis=axis,
                outputs=outputs,
            ),
        )
