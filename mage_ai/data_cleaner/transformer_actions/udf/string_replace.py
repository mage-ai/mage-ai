from mage_ai.data_cleaner.transformer_actions.udf.base import BaseUDF


class StringReplace(BaseUDF):
    def execute(self):
        pattern = self.options.get('pattern')
        replacement = self.options.get('replacement')
        if not pattern and not replacement:
            raise Exception('Require both `pattern` and `replacement` parameters.')
        return self.df[self.arguments[0]].str.replace(pattern, replacement)
