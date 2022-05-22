from data_cleaner.cleaning_rules.remove_collinear_columns import RemoveCollinearColumns
from data_cleaner.tests.base_test import TestCase
import pandas as pd
import numpy as np


class RemoveCollinearColumnsTests(TestCase):
    def test_evaluate(self):
        df = pd.DataFrame([
            [1000, 30000, 100000, 0],
            [500, 10000, 8000, 3000],
            [250, 7500, 6000, 8000],
            [1000, 45003, 200300, 0]
        ], columns=['number_of_users', 'views', 'revenue', 'losses'])
        column_types = {
            'number_of_users': 'number',
            'views': 'number',
            'revenue': 'number',
            'losses': 'number',
        }
        statistics = {}
        result = RemoveCollinearColumns(df, column_types, statistics).evaluate()
        expected_result = [
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'views\'. Removing \'views\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['views'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'revenue\'. Removing \'revenue\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['revenue'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'losses\'. Removing \'losses\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['losses'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'views\' '
                        'and \'revenue\'. Removing \'revenue\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['revenue'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            )
        ]
        self.assertEqual(result, expected_result)

    def test_collinear_dirty_dataframe(self):
        df = pd.DataFrame([
            [1000, None, 100000, 0],
            [500, 10000, 8000, 3000],
            [250, None, 6000, None],
            [1000, 45003, 200300, 0]
        ], columns=['number_of_users', 'views', 'revenue', 'losses'])
        column_types = {
            'number_of_users': 'number',
            'views': 'number',
            'revenue': 'number',
            'losses': 'number',
        }
        statistics = {}
        result = RemoveCollinearColumns(df, column_types, statistics).evaluate()
        expected_result = [
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'views\'. Removing \'views\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['views'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'revenue\'. Removing \'revenue\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['revenue'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'losses\'. Removing \'losses\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['losses'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'views\' '
                        'and \'revenue\'. Removing \'revenue\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['revenue'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'views\' '
                        'and \'losses\'. Removing \'losses\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['losses'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'revenue\' '
                        'and \'losses\'. Removing \'losses\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['losses'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            )
        ]
        self.assertEqual(result, expected_result)

    def test_collinear_nonnumerical_cols(self):
        df = pd.DataFrame([
            [1000, 'US',None, 100000, 0, 'cute animal #1'],
            [500, 'CA',10000, 8000, 3000, ''],
            [250, None,None, 6000, None, 'cute animal #3'],
            [1000, 'MX',45003, 200300, 0, None]
        ], columns=['number_of_users', 'location', 'views', 'revenue', 'losses', 'video'])
        column_types = {
            'number_of_users': 'number',
            'location': 'category',
            'views': 'number',
            'revenue': 'number',
            'losses': 'number',
            'video': 'text',
        }
        statistics = {}
        result = RemoveCollinearColumns(df, column_types, statistics).evaluate()
        expected_result = [
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'views\'. Removing \'views\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['views'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'revenue\'. Removing \'revenue\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['revenue'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'losses\'. Removing \'losses\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['losses'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'views\' '
                        'and \'revenue\'. Removing \'revenue\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['revenue'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'views\' '
                        'and \'losses\'. Removing \'losses\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['losses'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'revenue\' '
                        'and \'losses\'. Removing \'losses\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['losses'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            )
        ]
        self.assertEqual(result, expected_result)

    def test_collinear_no_results(self):
        df = pd.DataFrame([
            [1000, 30000, 6000, 0],
            [500, 30000, 8000, 200],
            [250, 30000, 2000, 400],
            [1000, 30000, 3000, 1000]
        ], columns=['number_of_users', 'views', 'revenue', 'losses'])
        column_types = {
            'number_of_users': 'number',
            'views': 'number',
            'revenue': 'number',
            'losses': 'number',
        }
        statistics = {}
        result = RemoveCollinearColumns(df, column_types, statistics).evaluate()
        self.assertEqual(result, [])

    def test_bad_dataframe_types(self):
        df = pd.DataFrame([
            ['', None, 100000, '0'],
            ['500', 10000, 8000, '3000'],
            ['250', None, 6000, ''],
            ['1000', 45003, 200300, '0']
        ], columns=['number_of_users', 'views', 'revenue', 'losses'])
        column_types = {
            'number_of_users': 'number',
            'views': 'number',
            'revenue': 'number',
            'losses': 'number',
        }
        statistics = {}
        result = RemoveCollinearColumns(df, column_types, statistics).evaluate()
        expected_result = [
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'views\'. Removing \'views\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['views'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'revenue\'. Removing \'revenue\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['revenue'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'number_of_users\' '
                        'and \'losses\'. Removing \'losses\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['losses'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'views\' '
                        'and \'revenue\'. Removing \'revenue\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['revenue'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'views\' '
                        'and \'losses\'. Removing \'losses\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['losses'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            ),
            dict(
                title='Remove collinear columns',
                message='The following columns are strongly correlated: \'revenue\' '
                        'and \'losses\'. Removing \'losses\' may increase data quality and '
                        'remove redundant data.',
                action_payload=dict(
                    action_type='remove',
                    action_arguments=['losses'],
                    axis='column',
                    action_options = {},
                    action_variables = {},
                    action_code = '',
                    outputs = [],
                )
            )
        ]
        self.assertEqual(result, expected_result)