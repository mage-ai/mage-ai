from mage_ai.data_cleaner.transformer_actions.helpers import extract_join_feature_set_version_id
from mage_ai.tests.base_test import TestCase


class ColumnTests(TestCase):
    def test_extract_join_feature_set_version_id(self):
        payload1 = dict(
            action_type='join',
            action_arguments=[100],
            action_options=dict(
                left_on=['user_id'],
                right_on=['id'],
            ),
        )
        payload2 = dict(
            action_type='join',
            action_arguments=['%{1}'],
            action_options=dict(
                left_on=['user_id'],
                right_on=['id'],
            ),
            action_variables={
                '1': {
                    'id': 200,
                    'type': 'feature_set_version',
                },
            },
        )
        payload3 = dict(
            action_type='filter',
        )
        fsv_id1 = extract_join_feature_set_version_id(payload1)
        fsv_id2 = extract_join_feature_set_version_id(payload2)
        fsv_id3 = extract_join_feature_set_version_id(payload3)
        self.assertEqual(fsv_id1, 100)
        self.assertEqual(fsv_id2, 200)
        self.assertEqual(fsv_id3, None)
