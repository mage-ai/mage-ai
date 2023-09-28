from unittest.mock import call, patch

from mage_ai.shared.retry import retry
from mage_ai.tests.base_test import TestCase


class RetryTests(TestCase):
    @patch('time.sleep')
    def test_retry(self, mock_sleep):
        @retry(retries=2, max_delay=40)
        def test_func():
            raise Exception('error')
            return

        with self.assertRaises(Exception):
            test_func()
            mock_sleep.assert_has_calls([call(5), call(10), call(20)])
