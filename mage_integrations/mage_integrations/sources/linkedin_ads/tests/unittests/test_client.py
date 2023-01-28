from unittest import mock
import tap_linkedin_ads.client as _client
import tap_linkedin_ads
import unittest
import requests
from datetime import datetime
import calendar

@mock.patch("requests.Session.post")
class TestLinkedInClient(unittest.TestCase):

    def test_access_token_empty_expires(self, mocked_post):
        '''
        Ensure that we retrieve and set expires for client with no self.__expires
        '''
        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')

        future_time = int(datetime.utcnow().timestamp()) + 100
        mocked_response = mock.Mock()
        mocked_response.json.return_value = {
            "expires_at": future_time
        }
        mocked_response.status_code = 200
        mocked_post.return_value = mocked_response

        expires = client.get_expires_time_for_test()
        assert expires is None

        client.fetch_and_set_access_token()
        expires = client.get_expires_time_for_test()
        self.assertEqual(expires, datetime.fromtimestamp(future_time))

    def test_access_token_expires_valid(self, mocked_post):
        '''
        Ensure that we check and return on valid self.__expires
        '''
        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')

        future_time = int(datetime.utcnow().timestamp()) + 100
        mocked_response = mock.MagicMock()
        mocked_response.status_code = 200
        mocked_response.json.return_value = {
            "access_token": "abcdef12345",
            "expires_at": future_time,
        }
        mocked_post.return_value = mocked_response

        client.set_mock_expires_for_test(datetime.fromtimestamp(future_time))
        client.fetch_and_set_access_token()
        expires = client.get_expires_time_for_test()
        self.assertEqual(expires, datetime.fromtimestamp(future_time))


    def test_access_token_expires_invalid(self, mocked_post):
        '''
        Ensure that we check self.__expires and retrieve new access token if it has expired
        '''
        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')

        old_time = int(datetime.utcnow().timestamp()) - 100
        mocked_response = mock.MagicMock()
        mocked_response.status_code = 200
        mocked_response.json.return_value = {
            "access_token": "abcdef12345",
            "expires_in": 5184000
        }
        mocked_post.return_value = mocked_response

        client.set_mock_expires_for_test(datetime.fromtimestamp(old_time))
        client.fetch_and_set_access_token()
        new_expires = client.get_expires_time_for_test()
        self.assertGreater(new_expires, datetime.fromtimestamp(old_time))

    def test_no_access_token(self, mocked_post):
        '''
        Ensure that we get an access token if we don't already have one
        '''
        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', None)

        expires = client.get_expires_time_for_test()
        assert expires is None

        old_time = int(datetime.utcnow().timestamp()) - 100
        mocked_response = mock.Mock()
        mocked_response.json.return_value = {
            "access_token": "abcdef12345",
            "expires_in": 5184000
        }
        mocked_response.status_code = 200
        mocked_post.return_value = mocked_response

        client.fetch_and_set_access_token()
        expires = client.get_expires_time_for_test()
        self.assertGreater(expires, datetime.fromtimestamp(old_time))
