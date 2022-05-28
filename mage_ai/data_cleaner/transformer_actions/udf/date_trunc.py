from mage_ai.data_cleaner.transformer_actions.udf.base import BaseUDF
import numpy as np
import pandas as pd


class DateTrunc(BaseUDF):
    def execute(self):
        date_part = self.options['date_part']
        date_column = self.arguments[0]
        df_copy = self.df.copy()
        df_copy[date_column] = pd.to_datetime(df_copy[date_column])
        if date_part == 'week':
            return (df_copy[date_column] - df_copy[date_column].dt.weekday * np.timedelta64(1, 'D')).\
                    dt.strftime('%Y-%m-%d')

        raise Exception(f'Date part {date_part} is not supported.')
