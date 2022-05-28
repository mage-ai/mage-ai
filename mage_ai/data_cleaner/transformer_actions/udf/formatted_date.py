from mage_ai.data_cleaner.transformer_actions.udf.base import BaseUDF
import pandas as pd


class FormattedDate(BaseUDF):
    def execute(self):
        return pd.to_datetime(
            self.df[self.arguments[0]],
        ).dt.strftime(self.options['format'])
