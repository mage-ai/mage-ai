from logging import NullHandler
from unittest import mock
import tap_linkedin_ads.client as _client
import tap_linkedin_ads
import unittest
import requests

def mocked_discover():
    class Catalog():
        def __init__(self):
            pass
        def to_dict(self):
            return {"streams":[]}

    return Catalog()

class Mockresponse:
    def __init__(self, status_code, json, raise_error, headers=None):
        self.status_code = status_code
        self.raise_error = raise_error
        self.text = json
        self.headers = headers

    def raise_for_status(self):
        if not self.raise_error:
            return self.status_code

        raise requests.HTTPError("Sample message")

    def json(self):
        return self.text

def get_response(status_code, json={}, raise_error=False):
    return Mockresponse(status_code, json, raise_error)

@mock.patch("tap_linkedin_ads.discover", side_effect=mocked_discover)
@mock.patch("requests.Session.get")
class TestValidLinkedInAccount(unittest.TestCase):
    '''
        Verify provided account numbers are valid account number or not as per LinkedInAds
    '''

    def test_valid_linkedIn_accounts(self, mocked_request, mocked_discover):
        '''
        If accounts are valid LinkedIn Ads accounts then discover will be called
        '''
        mocked_request.return_value = get_response(200, raise_error = True)
        config = {"accounts": "1111, 2222"}
        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        tap_linkedin_ads.do_discover(client, config)
        self.assertEqual(mocked_discover.call_count, 1)

    def test_invalid_linkedIn_accounts(self, mocked_request, mocked_discover):
        '''
        If accounts are invalid LinkedIn Ads accounts then Exception raised with explanatory message
        '''
        mocked_request.return_value = get_response(404, raise_error = True)
        config = {"accounts": "1111, 2222"}
        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            tap_linkedin_ads.do_discover(client, config)
        except Exception as e:
            expected_invalid_accounts = ["1111", "2222"]
            self.assertEqual(str(e), "Invalid Linked Ads accounts provided during the configuration:{}".format(expected_invalid_accounts))

        self.assertEqual(mocked_discover.call_count, 0)

    def test_invalid_numbers_linkedIn_accounts(self, mocked_request, mocked_discover):
        '''
        If accounts are invalid LinkedIn Ads accounts then Exception raised with explanatory message
        '''
        mocked_request.return_value = get_response(400, raise_error = True)
        config = {"accounts": "aaa, bbb"}
        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            tap_linkedin_ads.do_discover(client, config)
        except Exception as e:
            expected_invalid_accounts = ["aaa", "bbb"]
            self.assertEqual(str(e), "Invalid Linked Ads accounts provided during the configuration:{}".format(expected_invalid_accounts))

        self.assertEqual(mocked_discover.call_count, 0)
