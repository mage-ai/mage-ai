from unittest import mock
import tap_linkedin_ads.client as _client
import unittest
import requests

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

@mock.patch("requests.Session.request")
@mock.patch("tap_linkedin_ads.client.LinkedinClient.fetch_and_set_access_token")
class TestExceptionHandling(unittest.TestCase):
    def test_400_error_detailed_json(self, mocked_access_token, mocked_request):
        json = {
            "errorDetailType": "com.linkedin.common.error.BadRequest",
            "message": "Multiple errors occurred during the input validation. Please see errorDetails for more information.",
            "errorDetails": {"inputErrors": [
                    {"description": "Invalid argument",
                        "input": {
                            "inputPath": {
                                "fieldPath": "search/account"}},
                        "code": "ERROR :: /account/values/0 :: Invalid Urn Format. Key long is in invalid format. Urn urn:li:sponsoredAccount:aaa."
                    },
                    {"description": "Invalid argument",
                        "input": {
                            "inputPath": {
                                "fieldPath": "search/account/values/0"}},
                        "code": "Invalid value for field; wrong type or other syntax error"
                    }]},
            "status": 400}

        mocked_request.return_value = get_response(400, json = json, raise_error = True)

        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            client.request("GET")
        except _client.LinkedInBadRequestError as e:
            self.assertEquals(str(e), "HTTP-error-code: 400, Error: " + str(json.get("errorDetails")))

    def test_400_error_simple_json(self, mocked_access_token, mocked_request):
        json = {"message": "Invalid params for account.",
                "status": 400,
                "code": "BAD_REQUEST"}

        mocked_request.return_value = get_response(400, json = json, raise_error = True)

        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            client.request("GET")
        except _client.LinkedInBadRequestError as e:
            self.assertEquals(str(e), "HTTP-error-code: 400, Error: Invalid params for account.")

    def test_400_error_empty_json(self, mocked_access_token, mocked_request):
        mocked_request.return_value = get_response(400, raise_error = True)

        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            client.request("GET")
        except _client.LinkedInBadRequestError as e:
            self.assertEquals(str(e), "HTTP-error-code: 400, Error: The request is missing or has a bad parameter.")

    def test_404_error(self, mocked_access_token, mocked_request):
        json = {"message": "Not Found.",
                "status": 404,
                "code": "NOT_FOUND"}

        mocked_request.return_value = get_response(404, json = json, raise_error = True)

        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            client.request("GET")
        except _client.LinkedInNotFoundError as e:
            self.assertEquals(str(e), "HTTP-error-code: 404, Error: The resource you have specified cannot be found. Either the accounts provided are invalid or you do not have access to the Ad Account.")

    def test_404_error_empty_json(self, mocked_access_token, mocked_request):
        mocked_request.return_value = get_response(404, raise_error = True)

        client = _client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            client.request("GET")
        except _client.LinkedInNotFoundError as e:
            self.assertEquals(str(e), "HTTP-error-code: 404, Error: The resource you have specified cannot be found. Either the accounts provided are invalid or you do not have access to the Ad Account.")
