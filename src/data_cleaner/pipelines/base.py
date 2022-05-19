from data_cleaner.cleaning_rules.remove_columns_with_high_empty_rate import RemoveColumnsWithHighEmptyRate


DEFAULT_RULES = [RemoveColumnsWithHighEmptyRate]


class BasePipeline():
    def __init__(self):
        self.actions = []
        self.rules = DEFAULT_RULES

    def create_actions(self, df, column_types, statistics):
        all_suggestions = []
        for rule in self.rules:
            suggestions = rule(df, column_types, statistics).evaluate()
            if suggestions:
                all_suggestions += suggestions
        return all_suggestions

    def execute(self):
        if len(self.actions) == 0:
            raise Exception('Pipeline is empty.')
