import unittest
from types import SimpleNamespace

from tap_zendesk.streams import process_custom_field


class TestProcessCustomField(unittest.TestCase):
    def test_lookup_custom_field_is_nullable_string(self):
        field = SimpleNamespace(
            key='related_record',
            title='Related record',
            type='lookup',
        )

        self.assertEqual(
            {'type': ['string', 'null']},
            process_custom_field(field),
        )

    def test_unknown_custom_field_type_still_raises(self):
        field = SimpleNamespace(
            key='unsupported_field',
            title='Unsupported field',
            type='unsupported',
        )

        with self.assertRaises(Exception) as context:
            process_custom_field(field)

        self.assertIn(
            'Discovered unsupported type for custom field Unsupported field '
            '(key: unsupported_field): unsupported',
            str(context.exception),
        )
