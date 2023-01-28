
from unittest import mock
import tap_linkedin_ads.client as client
import unittest
import requests
import time

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

    def test_400_error_custom_message(self, mocked_access_token, mocked_request):
        mocked_request.return_value = get_response(400, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("GET")
        except client.LinkedInBadRequestError as e:
            self.assertEquals(str(e), "HTTP-error-code: 400, Error: The request is missing or has a bad parameter.")

    def test_401_error_custom_message(self, mocked_access_token, mocked_request):
        mocked_request.return_value = get_response(401, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInUnauthorizedError as e:
            self.assertEquals(str(e), "HTTP-error-code: 401, Error: Invalid authorization credentials.")

    def test_403_error_custom_message(self,mocked_access_token, mocked_request):
        mocked_request.return_value = get_response(403, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInForbiddenError as e:
            self.assertEquals(str(e), "HTTP-error-code: 403, Error: User does not have permission to access the resource.")

    def test_404_error_custom_message(self, mocked_access_token, mocked_request):
        mocked_request.return_value = get_response(404, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInNotFoundError as e:
            self.assertEquals(str(e), "HTTP-error-code: 404, Error: The resource you have specified cannot be found. Either the accounts provided are invalid or you do not have access to the Ad Account.")

    def test_405_error_custom_message(self, mocked_access_token, mocked_request):
        mocked_request.return_value = get_response(405, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInMethodNotAllowedError as e:
            self.assertEquals(str(e), "HTTP-error-code: 405, Error: The provided HTTP method is not supported by the URL.")

    def test_411_error_custom_message(self, mocked_access_token, mocked_request):
        mocked_request.return_value = get_response(411, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInLengthRequiredError as e:
            self.assertEquals(str(e), "HTTP-error-code: 411, Error: The server refuses to accept the request without a defined Content-Length header.")

    def test_400_error_response_message(self, mocked_access_token, mocked_request):
        response_json = {"message": "Invalid params for account.",
                            "status": 400,
                            "code": "BAD_REQUEST"}
        mocked_request.return_value = get_response(400, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInBadRequestError as e:
            self.assertEquals(str(e), "HTTP-error-code: 400, Error: {}".format(response_json.get('message')))

    def test_401_error_response_message(self, mocked_access_token, mocked_request):
        response_json = {"message": "The authorization has expired, please re-authorize.",
                            "status": 401,
                            "code": "UNAUTHORIZED"}
        mocked_request.return_value = get_response(401, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInUnauthorizedError as e:
            self.assertEquals(str(e), "HTTP-error-code: 401, Error: {}".format(response_json.get('message')))

    def test_403_error_response_message(self, mocked_access_token, mocked_request):
        response_json = {"message": "You do not have permission to access this resource.",
                            "status": 403,
                            "code": "FORBIDDEN"}
        mocked_request.return_value = get_response(403, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInForbiddenError as e:
            self.assertEquals(str(e), "HTTP-error-code: 403, Error: {}".format(response_json.get('message')))

    def test_404_error_response_message(self, mocked_access_token, mocked_request):
        response_json = {"message": "Not Found.",
                            "status": 404,
                            "code": "NOT_FOUND"}
        mocked_request.return_value = get_response(404, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInNotFoundError as e:
            self.assertEquals(str(e), "HTTP-error-code: 404, Error: The resource you have specified cannot be found. Either the accounts provided are invalid or you do not have access to the Ad Account.")

    def test_405_error_response_message(self, mocked_access_token, mocked_request):
        response_json = {"message": "The URL doesn't support this HTTP method.",
                            "status": 405,
                            "code": "METHOD_NOT_ALLOWED"}
        mocked_request.return_value = get_response(405, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInMethodNotAllowedError as e:
            self.assertEquals(str(e), "HTTP-error-code: 405, Error: {}".format(response_json.get('message')))

    def test_411_error_response_message(self, mocked_access_token, mocked_request):
        response_json = {"message": "Please add a defined Content-Length header.",
                            "status": 411,
                            "code": "LENGTH_REQUIRED"}
        mocked_request.return_value = get_response(411, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInLengthRequiredError as e:
            self.assertEquals(str(e), "HTTP-error-code: 411, Error: {}".format(response_json.get('message')))

    @mock.patch("tap_linkedin_ads.client.LOGGER.error")
    def test_401_error_expired_access_token(self, mocked_logger, mocked_access_token, mocked_request):
        response_json = {"message": "Expired access token, please re-authenticate.",
                            "status": 401,
                            "code": "UNAUTHORIZED"}
        mocked_request.return_value = get_response(401, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.request("POST")
        except client.LinkedInUnauthorizedError as e:
            mocked_logger.assert_called_with("Your access_token has expired as per LinkedIn’s security policy. Please re-authenticate your connection to generate a new token and resume extraction.")
            self.assertEquals(str(e), "HTTP-error-code: 401, Error: {}".format(response_json.get('message')))

@mock.patch("requests.Session.post")
class TestAccessToken(unittest.TestCase):

    def test_400_error_custom_message(self, mocked_request):
        mocked_request.return_value = get_response(400, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInBadRequestError as e:
            self.assertEquals(str(e), "HTTP-error-code: 400, Error: The request is missing or has a bad parameter.")

    def test_401_error_custom_message(self, mocked_request):
        mocked_request.return_value = get_response(401, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInUnauthorizedError as e:
            self.assertEquals(str(e), "HTTP-error-code: 401, Error: Invalid authorization credentials.")

    def test_403_error_custom_message(self, mocked_request):
        mocked_request.return_value = get_response(403, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInForbiddenError as e:
            self.assertEquals(str(e), "HTTP-error-code: 403, Error: User does not have permission to access the resource.")

    def test_404_error_custom_message(self, mocked_request):
        mocked_request.return_value = get_response(404, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInNotFoundError as e:
            self.assertEquals(str(e), "HTTP-error-code: 404, Error: The resource you have specified cannot be found. Either the accounts provided are invalid or you do not have access to the Ad Account.")

    def test_405_error_custom_message(self, mocked_request):
        mocked_request.return_value = get_response(405, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInMethodNotAllowedError as e:
            self.assertEquals(str(e), "HTTP-error-code: 405, Error: The provided HTTP method is not supported by the URL.")

    def test_411_error_custom_message(self, mocked_request):
        mocked_request.return_value = get_response(411, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInLengthRequiredError as e:
            self.assertEquals(str(e), "HTTP-error-code: 411, Error: The server refuses to accept the request without a defined Content-Length header.")

    def test_429_error_custom_message(self, mocked_request):
        mocked_request.return_value = get_response(429, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInRateLimitExceeededError as e:
            self.assertEquals(str(e), "HTTP-error-code: 429, Error: API rate limit exceeded, please retry after some time.")

    @mock.patch("time.sleep")
    def test_500_error_custom_message(self, mocked_sleep, mocked_request):
        mocked_request.return_value = get_response(500, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInInternalServiceError as e:
            self.assertEquals(str(e), "HTTP-error-code: 500, Error: An error has occurred at LinkedIn's end.")
        self.assertEquals(mocked_request.call_count, 5)

    @mock.patch("time.sleep")
    def test_504_error_custom_message(self, mocked_sleep, mocked_request):
        mocked_request.return_value = get_response(504, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInGatewayTimeoutError as e:
            self.assertEquals(str(e), "HTTP-error-code: 504, Error: A gateway timeout occurred. There is a problem at LinkedIn's end.")
        self.assertEquals(mocked_request.call_count, 5)

    def test_400_error_response_message(self, mocked_request):
        response_json = {"message": "Invalid params for account.",
                            "status": 400,
                            "code": "BAD_REQUEST"}
        mocked_request.return_value = get_response(400, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInBadRequestError as e:
            self.assertEquals(str(e), "HTTP-error-code: 400, Error: {}".format(response_json.get('message')))

    def test_401_error_response_message(self, mocked_request):
        response_json = {"message": "The authorization has expired, please re-authorize.",
                            "status": 401,
                            "code": "UNAUTHORIZED"}
        mocked_request.return_value = get_response(401, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInUnauthorizedError as e:
            self.assertEquals(str(e), "HTTP-error-code: 401, Error: {}".format(response_json.get('message')))

    def test_403_error_response_message(self, mocked_request):
        response_json = {"message": "You do not have permission to access this resource.",
                            "status": 403,
                            "code": "FORBIDDEN"}
        mocked_request.return_value = get_response(403, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInForbiddenError as e:
            self.assertEquals(str(e), "HTTP-error-code: 403, Error: {}".format(response_json.get('message')))

    def test_404_error_response_message(self, mocked_request):
        response_json = {"message": "Not Found.",
                            "status": 404,
                            "code": "NOT_FOUND"}
        mocked_request.return_value = get_response(404, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInNotFoundError as e:
            self.assertEquals(str(e), "HTTP-error-code: 404, Error: The resource you have specified cannot be found. Either the accounts provided are invalid or you do not have access to the Ad Account.")

    def test_405_error_response_message(self, mocked_request):
        response_json = {"message": "The URL doesn't support this HTTP method.",
                            "status": 405,
                            "code": "METHOD_NOT_ALLOWED"}
        mocked_request.return_value = get_response(405, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInMethodNotAllowedError as e:
            self.assertEquals(str(e), "HTTP-error-code: 405, Error: {}".format(response_json.get('message')))

    def test_411_error_response_message(self, mocked_request):
        response_json = {"message": "Please add a defined Content-Length header.",
                            "status": 411,
                            "code": "LENGTH_REQUIRED"}
        mocked_request.return_value = get_response(411, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInLengthRequiredError as e:
            self.assertEquals(str(e), "HTTP-error-code: 411, Error: {}".format(response_json.get('message')))

    def test_429_error_response_message(self, mocked_request):
        response_json = {"message": "APT ratelimit exceeded, retry after some time.",
                            "status": 429,
                            "code": "RATELIMIT_EXCEEDED"}
        mocked_request.return_value = get_response(429, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInRateLimitExceeededError as e:
            self.assertEquals(str(e), "HTTP-error-code: 429, Error: {}".format(response_json.get('message')))

    @mock.patch("time.sleep")
    def test_500_error_response_message(self, mocked_sleep, mocked_request):
        response_json = {"message": "Internal error, please retry after some time.",
                            "status": 500,
                            "code": "INTERNAL_ERROR"}
        mocked_request.return_value = get_response(500, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInInternalServiceError as e:
            self.assertEquals(str(e), "HTTP-error-code: 500, Error: {}".format(response_json.get('message')))
        self.assertEquals(mocked_request.call_count, 5)

    @mock.patch("time.sleep")
    def test_504_error_response_message(self, mocked_sleep, mocked_request):
        response_json = {"message": "Gateway timed out, please retry after some time.",
                            "status": 504,
                            "code": "GATEWAY_TIMEOUT"}
        mocked_request.return_value = get_response(504, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInGatewayTimeoutError as e:
            self.assertEquals(str(e), "HTTP-error-code: 504, Error: {}".format(response_json.get('message')))
        self.assertEquals(mocked_request.call_count, 5)

    @mock.patch("tap_linkedin_ads.client.LOGGER.error")
    def test_401_error_expired_access_token(self, mocked_logger, mocked_request):
        response_json = {"message": "Expired access token , please re-authenticate.",
                            "status": 401,
                            "code": "UNAUTHORIZED"}
        mocked_request.return_value = get_response(401, response_json, raise_error = True)
        linkedIn_client = client.LinkedinClient('client_id', 'client_secret', 'refresh_token', 'access_token')
        try:
            linkedIn_client.fetch_and_set_access_token()
        except client.LinkedInUnauthorizedError as e:
            mocked_logger.assert_called_with("Your access_token has expired as per LinkedIn’s security policy. Please re-authenticate your connection to generate a new token and resume extraction.")
            self.assertEquals(str(e), "HTTP-error-code: 401, Error: {}".format(response_json.get('message')))
