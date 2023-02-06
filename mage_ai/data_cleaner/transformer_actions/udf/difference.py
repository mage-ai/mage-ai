from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.data_cleaner.transformer_actions.udf.base import BaseUDF
import pandas as pd


class Difference(BaseUDF):
    def execute(self):
        col1 = self.arguments[0]
        column_type = self.options.get('column_type', self.kwargs.get('column_types', {}).get(col1))
        if len(self.arguments) > 1:
            col2 = self.arguments[1]
            return self.__difference_between_columns(
                self.df[col1],
                self.df[col2],
                column_type=column_type,
                options=self.options,
            )
        elif self.options.get('value') is not None:
            return self.__subtract_value(
                self.df[col1],
                self.options['value'],
                column_type=column_type,
                options=self.options,
            )
        raise Exception('Require second column or a value to minus.')

    def __difference_between_columns(self, column1, column2, column_type=None, options={}):
        if column_type == ColumnType.DATETIME:
            return (pd.to_datetime(column1, utc=True) - pd.to_datetime(column2, utc=True)).dt.days
        return column1 - column2

    def __subtract_value(self, original_column, value, column_type=None, options={}):
        if column_type == ColumnType.DATETIME:
            time_unit = options.get('time_unit', 'd')
            return (
                pd.to_datetime(original_column, utc=True) - pd.to_timedelta(value, unit=time_unit)
            ).dt.strftime('%Y-%m-%d %H:%M:%S')
        return original_column - value
