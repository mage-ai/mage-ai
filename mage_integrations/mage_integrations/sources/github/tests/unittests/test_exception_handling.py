from unittest import mock
import tap_github
from tap_github.client import GithubClient, raise_for_error, ConflictError, BadRequestException, BadCredentialsException, AuthException, InternalServerError
import unittest
import requests
from parameterized import parameterized

class Mockresponse:
    """ Mock response object class."""

    def __init__(self, status_code, json, raise_error, headers={'X-RateLimit-Remaining': 1}, content=None):
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

def get_mock_http_response(status_code, contents):
    """Return http mock response."""
    response = requests.Response()
    response.status_code = status_code
    response._content = contents.encode()
    return response

def get_response(status_code, json={}, raise_error=False, content=None):
    """ Returns required mock response. """
    return Mockresponse(status_code, json, raise_error, content=content)

@mock.patch("time.sleep")
@mock.patch("tap_github.client.GithubClient.verify_access_for_repo", return_value = None)
@mock.patch("requests.Session.request")
@mock.patch("singer.utils.parse_args")
class TestExceptionHandling(unittest.TestCase):
    
    """
    Test Error handling for `authed_get` method in client.
    """

    config = {"access_token": "", "repository": "org/test-repo, singer-io12/*"}

    def test_json_decoder_error(self, mocked_parse_args, mocked_request, mock_verify_access, mock_sleep):
        """
        Verify handling of JSONDecoderError from the response.
        """

        mock_response = get_mock_http_response(409, "json_error")

        with self.assertRaises(ConflictError) as e:
            raise_for_error(mock_response, "", "", "", True)

        # Verifying the message formed for the custom exception
        self.assertEqual(str(e.exception), "HTTP-error-code: 409, Error: The request could not be completed due to a conflict with the current state of the server.")

    @parameterized.expand([
        [400, "The request is missing or has a bad parameter.", BadRequestException, '', {}, 1],
        [401, "Invalid authorization credentials.", BadCredentialsException, '', {}, 1],
        [403, "User doesn't have permission to access the resource.", AuthException, '', {}, 1],
        [500, "An error has occurred at Github's end.", InternalServerError, '', {}, 5],
        [301, "The resource you are looking for is moved to another URL.", tap_github.client.MovedPermanentlyError, '', {}, 1],
        [304, "The requested resource has not been modified since the last time you accessed it.", tap_github.client.NotModifiedError, '', {}, 1],
        [409, "The request could not be completed due to a conflict with the current state of the server.", tap_github.client.ConflictError, '', {}, 1],
        [422, "The request was not able to process right now.", tap_github.client.UnprocessableError, '', {}, 1],
        [501, "Unknown Error", tap_github.client.Server5xxError, '', {}, 5],
        [429, "Too many requests occurred.", tap_github.client.TooManyRequests, '', {}, 5],
    ])
    def test_error_message_and_call_count(self, mocked_parse_args, mocked_request, mock_verify_access, mock_sleep, erro_code, error_msg, error_class, content, json_msg, call_count):
        """
        - Verify that `authed_get` raises an error with the proper message for different error codes.
        - Verify that tap retries 5 times for Server5xxError and RateLimitExceeded error.
        """
        mocked_request.return_value = get_response(erro_code, json = json_msg, raise_error = True, content = content)
        test_client = GithubClient(self.config)
        expected_error_message = "HTTP-error-code: {}, Error: {}".format(erro_code, error_msg)
        
        with self.assertRaises(error_class) as e:
            test_client.authed_get("", "")

        # Verifying the message formed for the custom exception
        self.assertEqual(str(e.exception), expected_error_message)

        # Verify the call count for each error.
        self.assertEquals(call_count, mocked_request.call_count)

    @mock.patch("tap_github.client.LOGGER.warning")
    def test_skip_404_error(self, mock_logger,  mocked_parse_args, mocked_request, mock_verify_access, mock_sleep):
        """
        Verify that `authed_get` skip 404 error and print the log message with the proper message.
        """
        json = {"message": "Not Found", "documentation_url": "https:/docs.github.com/"}
        mocked_request.return_value = get_response(404, json = json, raise_error = True)
        expected_message = "HTTP-error-code: 404, Error: The resource you have specified cannot be found. Alternatively the access_token is not valid for the resource. Please refer '{}' for more details.".format(json.get("documentation_url"))
        test_client = GithubClient(self.config)

        test_client.authed_get("", "")

        # Verifying the message formed for the custom exception
        self.assertEqual(mock_logger.mock_calls[0], mock.call(expected_message))

    def test_raise_404_error_for_invalid_repo(self, mocked_parse_args, mocked_request, mock_verify_access, mock_sleep):
        """
        Verify that `extract_repos_from_config` raises 404 error if invalid organization in given in the config.
        """
        config = {'repository': 'singer-io12/*', "access_token": "TOKEN"}
        test_client = GithubClient(config)
        mocked_request.return_value = get_response(404, raise_error = True)

        with self.assertRaises(tap_github.client.NotFoundException) as e:
            test_client.extract_repos_from_config()

        # Verifying the message formed for the custom exception
        self.assertEqual(str(e.exception), "HTTP-error-code: 404, Error: Please check the organization name 'singer-io12' or you do not have sufficient permissions to access this organization.")

