from mage_ai.data_cleaner.transformer_actions.query.query import QueryGenerator
from mage_ai.data_cleaner.transformer_actions.udf.base import BaseUDF


class IfElse(BaseUDF):
    def execute(self):
        df_copy = self.df.copy()
        true_index = QueryGenerator(df_copy)(self.code).execute().index
        arg1_type = self.options.get('arg1_type', 'value')
        arg2_type = self.options.get('arg2_type', 'value')
        arg1 = self.arguments[0]
        if arg1_type == 'column':
            arg1 = df_copy[arg1]
        arg2 = self.arguments[1]
        if arg2_type == 'column':
            arg2 = df_copy[arg2]
        df_copy.loc[true_index, 'result'] = arg1
        df_copy['result'] = df_copy['result'].fillna(arg2)
        return df_copy['result']
