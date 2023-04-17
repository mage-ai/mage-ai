from mage_ai.streaming.sinks.dummy import DummySink
from mage_ai.tests.base_test import TestCase
from unittest.mock import patch


class DummyTests(TestCase):
    def test_init(self):
        with patch.object(DummySink, 'init_client') as mock_init_client:
            DummySink(dict(
                connector_type='dummy',
                print_msg=True,
            ))
            mock_init_client.assert_called_once()

    def test_init_invalid_config(self):
        with patch.object(DummySink, 'init_client') as mock_init_client:
            with self.assertRaises(Exception) as context:
                DummySink(dict(
                    connector_type='dummy',
                    print_msg=True,
                    test_key='test_value',
                ))
            print(context.exception)
            self.assertTrue(
                '__init__() got an unexpected keyword argument \'test_key\''
                in str(context.exception),
            )
            self.assertEqual(mock_init_client.call_count, 0)
