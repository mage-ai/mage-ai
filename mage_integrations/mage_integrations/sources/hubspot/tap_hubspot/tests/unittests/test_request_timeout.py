import unittest
import requests
from unittest import mock
import tap_hubspot
class TestRequestTimeoutValue(unittest.TestCase):

    def test_integer_request_timeout_in_config(self):
        """
            Verify that if request_timeout is provided in config(integer value) then it should be use
        """
        tap_hubspot.CONFIG.update({"request_timeout": 100}) # integer timeout in config

        request_timeout = tap_hubspot.get_request_timeout()

        self.assertEqual(request_timeout, 100.0) # Verify timeout value

    def test_float_request_timeout_in_config(self):
        """
            Verify that if request_timeout is provided in config(float value) then it should be use
        """
        tap_hubspot.CONFIG.update({"request_timeout": 100.5}) # float timeout in config

        request_timeout = tap_hubspot.get_request_timeout()

        self.assertEqual(request_timeout, 100.5) # Verify timeout value

    def test_string_request_timeout_in_config(self):
        """
            Verify that if request_timeout is provided in config(string value) then it should be use
        """
        tap_hubspot.CONFIG.update({"request_timeout": "100"}) # string format timeout in config

        request_timeout = tap_hubspot.get_request_timeout()

        self.assertEqual(request_timeout, 100.0) # Verify timeout value

    def test_empty_string_request_timeout_in_config(self):
        """
            Verify that if request_timeout is provided in config with empty string then default value is used
        """
        tap_hubspot.CONFIG.update({"request_timeout": ""}) # empty string in config

        request_timeout = tap_hubspot.get_request_timeout()

        self.assertEqual(request_timeout, 300) # Verify timeout value

    def test_zero_request_timeout_in_config(self):
        """
            Verify that if request_timeout is provided in config with zero value then default value is used
        """
        tap_hubspot.CONFIG.update({"request_timeout": 0}) # zero value in config

        request_timeout = tap_hubspot.get_request_timeout()

        self.assertEqual(request_timeout, 300) # Verify timeout value

    def test_zero_string_request_timeout_in_config(self):
        """
            Verify that if request_timeout is provided in config with zero in string format then default value is used
        """
        tap_hubspot.CONFIG.update({"request_timeout": '0'}) # zero value in config

        request_timeout = tap_hubspot.get_request_timeout()

        self.assertEqual(request_timeout, 300) # Verify timeout value

    def test_no_request_timeout_in_config(self):
        """
            Verify that if request_timeout is not provided in config then default value is used
        """
        tap_hubspot.CONFIG = {}
        request_timeout = tap_hubspot.get_request_timeout()

        self.assertEqual(request_timeout, 300) # Verify timeout value


@mock.patch("time.sleep")
class TestRequestTimeoutBackoff(unittest.TestCase):

    @mock.patch('requests.Session.send', side_effect = requests.exceptions.Timeout)
    @mock.patch("requests.Request.prepare")
    @mock.patch('tap_hubspot.get_params_and_headers', return_value = ({}, {}))
    def test_request_timeout_backoff(self, mocked_get, mocked_prepare, mocked_send, mocked_sleep):
        """
            Verify request function is backoff for only 5 times on Timeout exception.
        """
        try:
            tap_hubspot.request('dummy_url', {})
        except Exception:
            pass

        # Verify that Session.send is called 5 times
        self.assertEqual(mocked_send.call_count, 5)

    @mock.patch('tap_hubspot.get_params_and_headers', return_value = ({}, {}))
    @mock.patch('requests.post', side_effect = requests.exceptions.Timeout)
    def test_request_timeout_backoff_for_post_search_endpoint(self, mocked_post, mocked_get, mocked_sleep):
        """
            Verify post_search_endpoint function is backoff for only 5 times on Timeout exception.
        """
        try:
            tap_hubspot.post_search_endpoint('dummy_url', {})
        except Exception:
            pass

        # Verify that requests.post is called 5 times
        self.assertEqual(mocked_post.call_count, 5)

    @mock.patch('requests.post', side_effect = requests.exceptions.Timeout)
    def test_request_timeout_backoff_for_acquire_access_token_from_refresh_token(self, mocked_post, mocked_sleep):
        """
            Verify request function is backoff for only 5 times instead of 25 times on Timeout exception that thrown from `acquire_access_token_from_refresh_token` method.
            Here get_params_and_headers method called from request method and acquire_access_token_from_refresh_token called from get_params_and_headers method.
        """
        try:
            tap_hubspot.post_search_endpoint('dummy_url', {})
        except Exception:
            pass

        # Verify that requests.post is called 5 times
        self.assertEqual(mocked_post.call_count, 5)
