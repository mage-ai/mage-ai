from mage_ai.data_preparation.templates.utils import build_template_from_suggestion
from mage_ai.tests.base_test import TestCase


class TemplateTest(TestCase):
    def test_template_creation(self):
        suggestion = dict(
            title='Remove rows with missing entries',
            message='Delete 3 rows to remove all missing values from the dataset.',
            action_payload=dict(
                action_type='filter',
                action_arguments=['state', 'location'],
                action_options={},
                action_variables=dict(
                    state=dict(feature=dict(column_type='category', uuid='state'), type='feature'),
                    location=dict(
                        feature=dict(column_type='zip_code', uuid='location'), type='feature'
                    ),
                ),
                action_code='state != null and location != null',
                axis='row',
                outputs=[],
            ),
            status='not_applied',
        )
        expected_string = """from mage_ai.data_cleaner.transformer_actions.base import BaseAction
from mage_ai.data_cleaner.transformer_actions.constants import ActionType, Axis
from mage_ai.data_cleaner.transformer_actions.utils import build_transformer_action
from pandas import DataFrame


@transformer
def remove_rows_with_missing_entries(df: DataFrame) -> DataFrame:
    \"\"\"
    Transformer Action: Delete 3 rows to remove all missing values from the dataset.
    \"\"\"
    action = {
        "action_type": "filter",
        "action_arguments": [
            "state",
            "location"
        ],
        "action_options": {},
        "action_variables": {
            "state": {
                "feature": {
                    "column_type": "category",
                    "uuid": "state"
                },
                "type": "feature"
            },
            "location": {
                "feature": {
                    "column_type": "zip_code",
                    "uuid": "location"
                },
                "type": "feature"
            }
        },
        "action_code": "state != null and location != null",
        "axis": "row",
        "outputs": []
    }
    return BaseAction(action).execute(df)
"""
        new_string = build_template_from_suggestion(suggestion)
        self.assertEqual(expected_string, new_string)
