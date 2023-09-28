from mage_ai.data_cleaner.transformer_actions.udf.base import BaseUDF


class Constant(BaseUDF):
    def execute(self):
        return self.arguments[0]
