import pandas as pd

from mage_ai.data_cleaner.transformer_actions.udf.base import BaseUDF


class FormattedDate(BaseUDF):
    def execute(self):
        return pd.to_datetime(
            self.df[self.arguments[0]],
            format='mixed',
        ).dt.strftime(self.options['format'])
