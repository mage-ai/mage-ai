from mage_ai.data_cleaner.transformer_actions.udf.base import BaseUDF


class StringSplit(BaseUDF):
    def execute(self):
        separator = self.options.get('separator')
        part_index = self.options.get('part_index')
        if separator is None or part_index is None:
            raise Exception('Require both `separator` and `part_index` parameters.')
        return self.df[self.arguments[0]].str.split(separator).str[part_index].str.strip()
