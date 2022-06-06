from mage_ai.data_cleaner.cleaning_rules.remove_duplicate_rows import RemoveDuplicateRows
from mage_ai.tests.base_test import TestCase
import pandas as pd


class RemoveDuplicateRowsTests(TestCase):
    def test_evaluate(self):
        df = pd.DataFrame(
            [
                [1, '2022-01-01'],
                [2, '2022-01-02'],
                [3, '2022-01-03'],
                [2, '2022-01-02'],
                [4, '2022-01-04'],
                [5, '2022-01-05'],
                [3, '2022-01-03'],
            ],
            columns=['id', 'deleted_at'],
        )
        column_types = {
            'id': 'number',
            'deleted_at': 'datetime',
        }
        result = RemoveDuplicateRows(
            df,
            column_types,
            {},
        ).evaluate()

        self.assertEqual(
            result,
            [
                dict(
                    title='Remove duplicate rows',
                    message='Remove 2 duplicated row(s) to reduce the amount of redundant data.',
                    status='not_applied',
                    action_payload=dict(
                        action_type='drop_duplicate',
                        action_arguments=[],
                        action_code='',
                        action_options={},
                        action_variables={},
                        axis='row',
                        outputs=[],
                    ),
                )
            ],
        )
