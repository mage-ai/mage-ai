from mage_ai.data_cleaner.transformer_actions.udf.base import BaseUDF


class Substring(BaseUDF):
    def execute(self):
        start = self.options.get('start')
        stop = self.options.get('stop')
        if start is None and stop is None:
            raise Exception('Require at least one of `start` and `stop` parameters.')
        return self.df[self.arguments[0]].str.slice(start=start, stop=stop)
