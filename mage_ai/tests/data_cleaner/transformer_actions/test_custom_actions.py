from mage_ai.data_cleaner.transformer_actions.custom_action import execute_custom_action
from mage_ai.tests.base_test import TestCase
from pandas.testing import assert_frame_equal
import pandas as pd
import numpy as np


class CustomActionTests(TestCase):
    def test_decorated_custom_action(self):
        df = pd.DataFrame(
            [
                ['1', 1.000, '2021-10-01', 'Store 1', 23023],
                ['1', None, '2021-10-01', 'Store 2', np.nan],
                [np.nan, 1100, '', '', 90233],
                ['2', None, None, 'Store 1', 23920],
                ['2', 12.00, '2021-09-01', None, np.nan],
                ['2', 125.0, '2021-09-01', 'Store 3', 49833],
            ],
            columns=[
                'group_id',
                'price',
                'group_churned_at',
                'store',
                'zip_code',
            ],
        )
        expected_df = pd.DataFrame(
            [
                [1.0, 1.000, '2021-10-01', 'Store 1', 23023, 1],
                [1.0, None, '2021-10-01', 'Store 2', np.nan, 1],
                [np.nan, 1100, np.nan, np.nan, 90233, None],
                [2.0, None, None, 'Store 1', 23920, 2],
                [2.0, 12.00, '2021-09-01', None, np.nan, 2],
                [2.0, 125.0, '2021-09-01', 'Store 3', 49833, 2],
            ],
            columns=['group_id', 'price', 'group_churned_at', 'store', 'zip_code', 'new_col'],
        )
        action = dict(
            action_type='custom',
            axis='row',
            action_code='''from mage_ai.data_cleaner.column_types.column_type_detector \
            import infer_column_types
from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.data_cleaner.transformer_actions.constants import CURRENCY_SYMBOLS
import pandas as pd
import numpy as np

def clean_series(series, column_type, dropna=True):
    series_cleaned = series.apply(lambda x: x.strip(" \\\'\\\"")
if type(x) is str else x)
    series_cleaned = series_cleaned.map(
        lambda x: x if (not isinstance(x, str) or (len(x) > 0 and
    not x.isspace())) else np.nan
    )
    if dropna:
        series_cleaned = series_cleaned.dropna()
    if series_cleaned.count() == 0:
        return series_cleaned
    first_item = series_cleaned.dropna().iloc[0]
    if column_type == ColumnType.NUMBER or column_type == ColumnType.NUMBER_WITH_DECIMALS:
        is_percent = False
        if type(first_item) is str:
            series_cleaned = series_cleaned.str.replace(",", "")
            if series_cleaned.str.count(CURRENCY_SYMBOLS).sum() != 0:
                series_cleaned = series_cleaned.str.replace(CURRENCY_SYMBOLS, "")
            elif series_cleaned.str.contains("%").sum() != 0:
                is_percent = True
                series_cleaned = series_cleaned.str.replace("%", "")
            series_cleaned = series_cleaned.str.replace(" ", "")
            if column_type == ColumnType.NUMBER:
                try:
                    series_cleaned = series_cleaned.astype(int)
                except ValueError:
                    series_cleaned = series_cleaned.astype(float)
            else:
                series_cleaned = series_cleaned.astype(float)
            if is_percent:
                series_cleaned /= 100
    elif column_type == ColumnType.DATETIME:
        series_cleaned = pd.to_datetime(series_cleaned, errors="coerce", infer_datetime_format=True)
    return series_cleaned

@transformer_action
def clean_df(df):
    ctypes = infer_column_types(df)
    for col in df.columns:
        df[col] = clean_series(df[col], ctypes, dropna=False)
    return df

@transformer_action
def print_df(df):
    print(df)
    return df

@transformer_action
def print_df_dtypes(df):
    print(df.dtypes)
    return df

@transformer_action
def add_column(df):
    columns = list(df.columns)
    df["new_col"] = df[columns[0]]
    return df
            ''',
            action_variables={},
        )
        new_df = execute_custom_action(df, action)
        new_df['group_id'] = new_df['group_id'].astype(float)
        new_df['new_col'] = new_df['new_col'].astype(float)
        assert_frame_equal(new_df, expected_df)

    def test_scripted_custom_action(self):
        df = pd.DataFrame(
            [
                ['1', 1.000, '2021-10-01', 'Store 1', 23023],
                ['1', None, '2021-10-01', 'Store 2', np.nan],
                [np.nan, 1100, '', '', 90233],
                ['2', None, None, 'Store 1', 23920],
                ['2', 12.00, '2021-09-01', None, np.nan],
                ['2', 125.0, '2021-09-01', 'Store 3', 49833],
            ],
            columns=[
                'group_id',
                'price',
                'group_churned_at',
                'store',
                'zip_code',
            ],
        )
        expected_df = pd.DataFrame(
            [
                [1.0, 1.000, '2021-10-01', 'Store 1', 23023, 1],
                [1.0, None, '2021-10-01', 'Store 2', np.nan, 1],
                [np.nan, 1100, np.nan, np.nan, 90233, None],
                [2.0, None, None, 'Store 1', 23920, 2],
                [2.0, 12.00, '2021-09-01', None, np.nan, 2],
                [2.0, 125.0, '2021-09-01', 'Store 3', 49833, 2],
            ],
            columns=['group_id', 'price', 'group_churned_at', 'store', 'zip_code', 'new_col'],
        )
        action = dict(
            action_type='custom',
            axis='row',
            action_code='''from mage_ai.data_cleaner.column_types.column_type_detector \
            import infer_column_types
from mage_ai.data_cleaner.column_types.constants import ColumnType
from mage_ai.data_cleaner.transformer_actions.constants import CURRENCY_SYMBOLS
import pandas as pd
import numpy as np

def clean_series(series, column_type, dropna=True):
    series_cleaned = series.apply(lambda x: x.strip(" \\\'\\\"")
if type(x) is str else x)
    series_cleaned = series_cleaned.map(
        lambda x: x if (not isinstance(x, str) or (len(x) > 0 and
    not x.isspace())) else np.nan
    )
    if dropna:
        series_cleaned = series_cleaned.dropna()
    if series_cleaned.count() == 0:
        return series_cleaned
    first_item = series_cleaned.dropna().iloc[0]
    if column_type == ColumnType.NUMBER or column_type == ColumnType.NUMBER_WITH_DECIMALS:
        is_percent = False
        if type(first_item) is str:
            series_cleaned = series_cleaned.str.replace(",", "")
            if series_cleaned.str.count(CURRENCY_SYMBOLS).sum() != 0:
                series_cleaned = series_cleaned.str.replace(CURRENCY_SYMBOLS, "")
            elif series_cleaned.str.contains("%").sum() != 0:
                is_percent = True
                series_cleaned = series_cleaned.str.replace("%", "")
            series_cleaned = series_cleaned.str.replace(" ", "")
            if column_type == ColumnType.NUMBER:
                try:
                    series_cleaned = series_cleaned.astype(int)
                except ValueError:
                    series_cleaned = series_cleaned.astype(float)
            else:
                series_cleaned = series_cleaned.astype(float)
            if is_percent:
                series_cleaned /= 100
    elif column_type == ColumnType.DATETIME:
        series_cleaned = pd.to_datetime(series_cleaned, errors="coerce", infer_datetime_format=True)
    return series_cleaned

ctypes = infer_column_types(df)
for col in df.columns:
    df[col] = clean_series(df[col], ctypes, dropna=False)
print(df)
print(df.dtypes)
columns = list(df.columns)
df["new_col"] = df[columns[0]]
            ''',
            action_variables={},
        )
        new_df = execute_custom_action(df, action)
        new_df['group_id'] = new_df['group_id'].astype(float)
        new_df['new_col'] = new_df['new_col'].astype(float)
        assert_frame_equal(new_df, expected_df)
