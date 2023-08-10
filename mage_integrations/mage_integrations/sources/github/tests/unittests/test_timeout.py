import unittest
from unittest import mock
import tap_github
from tap_github.client import GithubClient, REQUEST_TIMEOUT
import requests
from parameterized import parameterized

class Mockresponse:
    """ Mock response object class."""

    def __init__(self, status_code, json, raise_error, headers={'X-RateLimit-Remaining': 1}, text=None, content=None):
        self.status_code = status_code
        self.raise_error = raise_error
        self.text = json
        self.headers = headers
        self.content = content if content is not None else 'github'

    def raise_for_status(self):
        if not self.raise_error:
            return self.status_code

        raise requests.HTTPError("Sample message")

    def json(self):
        """ Response JSON method."""
        return self.text

class MockParseArgs:
    """Mock args object class"""
    config = {}
    def __init__(self, config):
        self.config = config

def get_args(config):
    """ Returns required args response. """
    return MockParseArgs(config)

def get_response(status_code, json={}, raise_error=False, content=None):
    """ Returns required mock response. """
    return Mockresponse(status_code, json, raise_error, content=content)

@mock.patch("tap_github.client.GithubClient.verify_access_for_repo", return_value = None)
@mock.patch("time.sleep")
@mock.patch("requests.Session.request")
@mock.patch("singer.utils.parse_args")
class TestTimeoutValue(unittest.TestCase):
    """
        Test case to verify the timeout value is set as expected
    """
    json = {"key": "value"}

    @parameterized.expand([
        ["test_int_value", {"request_timeout": 100, "access_token": "access_token"}, 100.0],
        ["test_str_value", {"request_timeout": "100", "access_token": "access_token"}, 100.0],
        ["test_empty_value", {"request_timeout": "", "access_token": "access_token"}, 300.0],
        ["test_int_zero_value", {"request_timeout": 0, "access_token": "access_token"}, 300.0],
        ["test_str_zero_value", {"request_timeout": "0", "access_token": "access_token"}, 300.0],
        ["test_no_value", {"request_timeout": "0", "access_token": "access_token"}, REQUEST_TIMEOUT]

    ])
    def test_timeout_value_in_config(self, mocked_parse_args, mocked_request, mocked_sleep, mock_verify_access, name, config, expected_value):
        """
        Test if timeout value given in config
        """
        # mock response
        mocked_request.return_value = get_response(200, self.json)

        mock_config = config
        # mock parse args
        mocked_parse_args.return_value = get_args(mock_config)
        test_client = GithubClient(mock_config)

        # get the timeout value for assertion
        timeout = test_client.get_request_timeout()
        # function call
        test_client.authed_get("test_source", "")

        # verify that we got expected timeout value
        self.assertEqual(expected_value, timeout)
        # verify that the request was called with expected timeout value
        mocked_request.assert_called_with(method='get', url='', timeout=expected_value)


@mock.patch("tap_github.client.GithubClient.verify_access_for_repo", return_value = None)
@mock.patch("time.sleep")
@mock.patch("requests.Session.request")
@mock.patch("singer.utils.parse_args")
class TestTimeoutAndConnnectionErrorBackoff(unittest.TestCase):
    """
        Test case to verify that we backoff for 5 times for Connection and Timeout error
    """

    @parameterized.expand([
        ["test_timeout_backoff", requests.Timeout],
        ["test_connection_error_backoff", requests.ConnectionError]
    ])
    def test_backoff(self, mocked_parse_args, mocked_request, mocked_sleep, mock_verify_access, name, error_class):
        """
        Test that tap retry timeout or connection error 5 times.
        """
        # mock request and raise error
        mocked_request.side_effect = error_class

        mock_config = {"access_token": "access_token"}
        # mock parse args
        mocked_parse_args.return_value = get_args(mock_config)
        test_client = GithubClient(mock_config)

        with self.assertRaises(error_class):
            test_client.authed_get("test_source", "")

        # verify that we backoff 5 times
        self.assertEqual(5, mocked_request.call_count)


