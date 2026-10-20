from unittest import mock
import tap_linkedin_ads.client as client
import unittest
import requests


class TestTimeoutValue(unittest.TestCase):
    """
        Verify the value of timeout is set as expected
    """

    def test_timeout_value_not_passed_in_config(self):
        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent"}

        # initialize 'LinkedinClient'
        cl = client.LinkedinClient(client_id=config['client_id'],
                                   client_secret=config['client_secret'],
                                   refresh_token=config['refresh_token'],
                                   access_token=config['access_token'],
                                   user_agent=config['user_agent'],
                                   request_timeout=config.get('request_timeout'))

        # verify that timeout value is default as request timeout is not passed in config
        self.assertEqual(300, cl.request_timeout)

    def test_timeout_int_value_passed_in_config(self):
        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent",
                  "request_timeout": 100}

        # initialize 'LinkedinClient'
        cl = client.LinkedinClient(client_id=config['client_id'],
                                   client_secret=config['client_secret'],
                                   refresh_token=config['refresh_token'],
                                   access_token=config['access_token'],
                                   user_agent=config['user_agent'],
                                   request_timeout=config.get('request_timeout'))

        # verify that timeout value is same as the value passed in the config
        self.assertEqual(100.0, cl.request_timeout)

    def test_timeout_string_value_passed_in_config(self):
        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent",
                  "request_timeout": "100"}

        # initialize 'LinkedinClient'
        cl = client.LinkedinClient(client_id=config['client_id'],
                                   client_secret=config['client_secret'],
                                   refresh_token=config['refresh_token'],
                                   access_token=config['access_token'],
                                   user_agent=config['user_agent'],
                                   request_timeout=config.get('request_timeout'))

        # verify that timeout value is same as the value passed in the config
        self.assertEqual(100.0, cl.request_timeout)

    def test_timeout_empty_value_passed_in_config(self):
        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent",
                  "request_timeout": ""}

        # initialize 'LinkedinClient'
        cl = client.LinkedinClient(client_id=config['client_id'],
                                   client_secret=config['client_secret'],
                                   refresh_token=config['refresh_token'],
                                   access_token=config['access_token'],
                                   user_agent=config['user_agent'],
                                   request_timeout=config.get('request_timeout'))

        # verify that timeout value is default as request timeout is empty in the config
        self.assertEqual(300, cl.request_timeout)

    def test_timeout_0_value_passed_in_config(self):
        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent",
                  "request_timeout": 0.0}

        # initialize 'LinkedinClient'
        cl = client.LinkedinClient(client_id=config['client_id'],
                                   client_secret=config['client_secret'],
                                   refresh_token=config['refresh_token'],
                                   access_token=config['access_token'],
                                   user_agent=config['user_agent'],
                                   request_timeout=config.get('request_timeout'))

        # verify that timeout value is default as request timeout is zero in the config
        self.assertEqual(300, cl.request_timeout)

    def test_timeout_string_0_value_passed_in_config(self):
        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent",
                  "request_timeout": "0.0"}

        # initialize 'LinkedinClient'
        cl = client.LinkedinClient(client_id=config['client_id'],
                                   client_secret=config['client_secret'],
                                   refresh_token=config['refresh_token'],
                                   access_token=config['access_token'],
                                   user_agent=config['user_agent'],
                                   request_timeout=config.get('request_timeout'))

        # verify that timeout value is default as request timeout is zero in the config
        self.assertEqual(300, cl.request_timeout)


@mock.patch("time.sleep")
@mock.patch("requests.Session.request")
class TestTimeoutBackoff(unittest.TestCase):
    """
        Verify that we backoff for 5 times for the 'Timeout' error
    """

    def test_timeout_error__check_access_token(self, mocked_request, mocked_sleep):

        # mock request and raise the 'Timeout' error
        mocked_request.side_effect = requests.Timeout

        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent"}

        # initialize 'LinkedinClient'
        try:
            with client.LinkedinClient(client_id=config['client_id'],
                                       client_secret=config['client_secret'],
                                       refresh_token=config['refresh_token'],
                                       access_token=config['access_token'],
                                       user_agent=config['user_agent'],
                                       request_timeout=config.get('request_timeout')) as cl:
                pass
        except requests.Timeout:
            pass

        # verify that we backoff for 5 times
        self.assertEqual(mocked_request.call_count, 5)

    def test_timeout_error__check_accounts(self, mocked_request, mocked_sleep):

        # mock request and raise the 'Timeout' error
        mocked_request.side_effect = requests.Timeout

        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent",
                  "accounts": "1, 2"}

        # initialize 'LinkedinClient'
        cl = client.LinkedinClient(client_id=config['client_id'],
                                   client_secret=config['client_secret'],
                                   refresh_token=config['refresh_token'],
                                   access_token=config['access_token'],
                                   user_agent=config['user_agent'],
                                   request_timeout=config.get('request_timeout'))

        try:
            # function call
            cl.check_accounts(config)
        except requests.Timeout:
            pass

        # verify that we backoff for 5 times
        self.assertEqual(mocked_request.call_count, 5)

    def test_timeout_error__request(self, mocked_request, mocked_sleep):

        # mock request and raise the 'Timeout' error
        mocked_request.side_effect = requests.Timeout

        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent",
                  "accounts": "1, 2"}

        # initialize 'LinkedinClient'
        cl = client.LinkedinClient(client_id=config['client_id'],
                                   client_secret=config['client_secret'],
                                   refresh_token=config['refresh_token'],
                                   access_token=config['access_token'],
                                   user_agent=config['user_agent'],
                                   request_timeout=config.get('request_timeout'))

        try:
            # function call
            cl.request('GET')
        except requests.Timeout:
            pass

        # verify that we backoff for 5 times
        self.assertEqual(mocked_request.call_count, 5)


@mock.patch("time.sleep")
@mock.patch("requests.Session.request")
class TestConnectionErrorBackoff(unittest.TestCase):
    """
        Verify that we backoff for 5 times for the 'ConnectionError'
    """

    def test_connection_error__check_access_token(self, mocked_request, mocked_sleep):

        # mock request and raise the 'ConnectionError'
        mocked_request.side_effect = requests.ConnectionError

        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent",
                  "user_agent": "test_user_agent"}

        # initialize 'LinkedinClient'
        try:
            with client.LinkedinClient(client_id=config['client_id'],
                                       client_secret=config['client_secret'],
                                       refresh_token=config['refresh_token'],
                                       access_token=config['access_token'],
                                       user_agent=config['user_agent'],
                                       request_timeout=config.get('request_timeout')) as cl:
                pass
        except requests.ConnectionError:
            pass

        # verify that we backoff for 5 times
        self.assertEqual(mocked_request.call_count, 5)

    def test_connection_error__check_accounts(self, mocked_request, mocked_sleep):

        # mock request and raise the 'ConnectionError'
        mocked_request.side_effect = requests.ConnectionError

        config = {"client_id": "test_client_id",
                  "client_secret": "test_client_secret",
                  "refresh_token": "test_refresh_token",
                  "access_token": "test_access_token",
                  "user_agent": "test_user_agent",
                  "accounts": "1, 2"}

        # initialize 'LinkedinClient'
        cl = client.LinkedinClient(client_id=config['client_id'],
                                   client_secret=config['client_secret'],
                                   refresh_token=config['refresh_token'],
                                   access_token=config['access_token'],
                                   user_agent=config['user_agent'],
                                   request_timeout=config.get('request_timeout'))

        try:
            # function call
            cl.check_accounts(config)
        except requests.ConnectionError:
            pass

        # verify that we backoff for 5 times
        self.assertEqual(mocked_request.call_count, 5)
