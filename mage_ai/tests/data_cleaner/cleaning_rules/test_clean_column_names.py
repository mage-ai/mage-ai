from mage_ai.data_cleaner.cleaning_rules.clean_column_names import CleanColumnNames
from mage_ai.data_cleaner.transformer_actions.constants import ActionType
from mage_ai.tests.base_test import TestCase
import pandas as pd


class CleanColumnNameTests(TestCase):
    def test_evaluate(self):
        df = pd.DataFrame([
            ['', '', '', '', '', '', '' , '', '', '', ''], 
        ], columns=[
            'good_name',
            'Bad Case',
            '%@#342%34@@#342',
            'yield',
            '12342',
            '1234.    23',
            'true_crime',
            '@#f$%&*o$*(%^&r*$%&',
            'PascalCaseTitle',
            'camelCaseName',
            'lowercase9234'
            ]
        )
        result = CleanColumnNames(
            df,
            {},
            {},
        ).evaluate()

        self.assertEqual(result, [
            dict(
                title='Clean dirty column names',
                message='The following columns have unclean naming conventions: '
                '[\'Bad Case\', \'%@#342%34@@#342\', \'yield\','
                ' \'12342\', \'1234.    23\', \'@#f$%&*o$*(%^&r*$%&\', '
                '\'PascalCaseTitle\', \'camelCaseName\']'
                '. Making these names lowercase and alphanumeric may improve'
                'ease of dataset access and reduce security risks.',
                status='not_applied',
                action_payload=dict(
                    action_type=ActionType.CLEAN_COLUMN_NAME,
                    action_arguments=[
                        'Bad Case',
                        '%@#342%34@@#342',
                        'yield',
                        '12342',
                        '1234.    23',
                        '@#f$%&*o$*(%^&r*$%&',
                        'PascalCaseTitle',
                        'camelCaseName'
                    ],
                    action_code='',
                    action_options={},
                    action_variables={},
                    axis='column',
                    outputs=[],
                ),
            )
        ])
