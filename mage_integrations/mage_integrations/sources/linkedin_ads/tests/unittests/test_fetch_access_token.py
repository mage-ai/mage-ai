import unittest
import datetime

from datetime import timedelta
from unittest import mock
import tap_linkedin_ads.sync as sync
from tap_linkedin_ads.client import LinkedinClient


class Mockresponse:
    def __init__(self, status_code, resp={}, content=None, headers=None, raise_error=False):
        self.json_data = resp
        self.status_code = status_code
        self.content = content
        self.headers = headers
        self.raise_error = raise_error
    
    def json(self):
        return self.json_data

class TestFetchAccessToken(unittest.TestCase):

    def test_fetch_access_token_without_refresh_token(self):
        """Test that when refresh token is not passed in config properties, conection uses the existing access token"""
        cl=LinkedinClient(None, None, None, 'access_token')
        cl.fetch_and_set_access_token()
        self.assertEquals(cl.access_token, 'access_token')
    
    @mock.patch("requests.Session.post")
    def test_fetch_access_token_with_refresh_token(self, mock_session_post):
        """Test that when refresh token is passed in config properties, conection uses the new access token"""
        mock_session_post.return_value = Mockresponse(200, {'access_token': 'new_access_token', 'expires_in': 86400, 'expires_at': 86400})

        cl=LinkedinClient('client_id', 'client_secret', 'refresh_token', 'old_access_token')
        cl.fetch_and_set_access_token()
        self.assertEquals(cl.access_token, 'new_access_token')
