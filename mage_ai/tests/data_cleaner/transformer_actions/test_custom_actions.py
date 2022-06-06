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
        action = {
            'action_type': 'custom',
            'axis': 'row',
            'action_code': 'from mage_ai.data_cleaner.column_type_detector import NUMBER,'
            ' NUMBER_WITH_DECIMALS, DATETIME, infer_column_types\n'
            'from mage_ai.data_cleaner.transformer_actions.constants import CURRENCY_SYMBOLS\n'
            'import pandas as pd\n'
            'import numpy as np\n\n\n'
            'def clean_series(series, column_type, dropna=True):\n'
            '    series_cleaned = series.apply(lambda x: x.strip(" \\\'\\\"") '
            'if type(x) is str else x)\n'
            '    series_cleaned = series_cleaned.map(\n'
            '        lambda x: x if (not isinstance(x, str) or (len(x) > 0 and'
            ' not x.isspace())) else np.nan\n '
            '   )\n'
            '    if dropna:\n'
            '        series_cleaned = series_cleaned.dropna()\n\n'
            '    if series_cleaned.count() == 0:\n'
            '        return series_cleaned\n\n'
            '    first_item = series_cleaned.dropna().iloc[0]\n'
            '    if column_type == NUMBER or column_type == NUMBER_WITH_DECIMALS:\n'
            '        is_percent = False\n        if type(first_item) is str:\n'
            '            series_cleaned = series_cleaned.str.replace(",", "")\n'
            '            if series_cleaned.str.count(CURRENCY_SYMBOLS).sum() != 0:\n'
            '                series_cleaned = series_cleaned.str.replace(CURRENCY_SYMBOLS, "")\n'
            '            elif series_cleaned.str.contains("%").sum() != 0:\n'
            '                is_percent = True\n'
            '                series_cleaned = series_cleaned.str.replace("%", "")\n'
            '            series_cleaned = series_cleaned.str.replace(" ", "")\n'
            '        if column_type == NUMBER:\n'
            '           try:\n'
            '                series_cleaned = series_cleaned.astype(int)\n'
            '           except ValueError:\n'
            '                series_cleaned = series_cleaned.astype(float)\n'
            '        else:\n            series_cleaned = series_cleaned.astype(float)\n'
            '        if is_percent:\n'
            '            series_cleaned /= 100\n'
            '    elif column_type == DATETIME:\n'
            '        series_cleaned = pd.to_datetime(series_cleaned, errors="coerce",'
            ' infer_datetime_format=True)\n'
            '    return series_cleaned\n'
            '   \n\n@custom_action\ndef clean_df(df):\n'
            '    ctypes = infer_column_types(df)\n'
            '    for col in df.columns:\n'
            '        df[col] = clean_series(df[col], ctypes, dropna=False)\n'
            '    return df\n\n'
            '@custom_action  \n'
            'def print_df(df):\n'
            '    print(df)\n'
            '    return df\n'
            '    \n'
            '@custom_action\n'
            'def print_df_dtypes(df):\n'
            '    print(df.dtypes)\n'
            '    return df\n'
            '    \n'
            '@custom_action\n'
            'def add_column(df):\n'
            '    columns = list(df.columns)\n'
            '    df["new_col"] = df[columns[0]]\n'
            '    return df',
            'action_variables': {},
        }
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
        action = {
            'action_type': 'custom',
            'axis': 'row',
            'action_code': 'from mage_ai.data_cleaner.column_type_detector import NUMBER,'
            ' NUMBER_WITH_DECIMALS, DATETIME, infer_column_types\n'
            'from mage_ai.data_cleaner.transformer_actions.constants import CURRENCY_SYMBOLS\n'
            'import pandas as pd\n'
            'import numpy as np\n\n\n'
            'def clean_series(series, column_type, dropna=True):\n'
            '    series_cleaned = series.apply(lambda x: x.strip(" \\\'\\\"") '
            'if type(x) is str else x)\n'
            '    series_cleaned = series_cleaned.map(\n'
            '        lambda x: x if (not isinstance(x, str) or (len(x) > 0 and'
            ' not x.isspace())) else np.nan\n '
            '   )\n'
            '    if dropna:\n'
            '        series_cleaned = series_cleaned.dropna()\n\n'
            '    if series_cleaned.count() == 0:\n'
            '        return series_cleaned\n\n'
            '    first_item = series_cleaned.dropna().iloc[0]\n'
            '    if column_type == NUMBER or column_type == NUMBER_WITH_DECIMALS:\n'
            '        is_percent = False\n        if type(first_item) is str:\n'
            '            series_cleaned = series_cleaned.str.replace(",", "")\n'
            '            if series_cleaned.str.count(CURRENCY_SYMBOLS).sum() != 0:\n'
            '                series_cleaned = series_cleaned.str.replace(CURRENCY_SYMBOLS, "")\n'
            '            elif series_cleaned.str.contains("%").sum() != 0:\n'
            '                is_percent = True\n'
            '                series_cleaned = series_cleaned.str.replace("%", "")\n'
            '            series_cleaned = series_cleaned.str.replace(" ", "")\n'
            '        if column_type == NUMBER:\n'
            '           try:\n'
            '                series_cleaned = series_cleaned.astype(int)\n'
            '           except ValueError:\n'
            '                series_cleaned = series_cleaned.astype(float)\n'
            '        else:\n            series_cleaned = series_cleaned.astype(float)\n'
            '        if is_percent:\n'
            '            series_cleaned /= 100\n'
            '    elif column_type == DATETIME:\n'
            '        series_cleaned = pd.to_datetime(series_cleaned, errors="coerce",'
            ' infer_datetime_format=True)\n'
            '    return series_cleaned\n'
            '   \n\n'
            'ctypes = infer_column_types(df)\n'
            'for col in df.columns:\n'
            '    df[col] = clean_series(df[col], ctypes, dropna=False)\n'
            'print(df)\n'
            'print(df.dtypes)\n'
            'columns = list(df.columns)\n'
            'df["new_col"] = df[columns[0]]\n',
            'action_variables': {},
        }
        new_df = execute_custom_action(df, action)
        new_df['group_id'] = new_df['group_id'].astype(float)
        new_df['new_col'] = new_df['new_col'].astype(float)
        assert_frame_equal(new_df, expected_df)
