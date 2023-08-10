from unittest import mock
import tap_github
from tap_github.client import GithubClient
import unittest
import requests

class Mockresponse:
    """ Mock response object class."""

    def __init__(self, status_code, json, raise_error, headers={'X-RateLimit-Remaining': 1}, text=None):
        self.status_code = status_code
        self.raise_error = raise_error
        self.text = json
        self.headers = headers
        self.content = "github"

    def raise_for_status(self):
        if not self.raise_error:
            return self.status_code

        raise requests.HTTPError("Sample message")

    def json(self):
        """ Response JSON method."""
        return self.text

def get_response(status_code, json={}, raise_error=False):
    """ Returns required mock response. """
    return Mockresponse(status_code, json, raise_error)

@mock.patch("tap_github.client.GithubClient.verify_access_for_repo", return_value = None)
@mock.patch("requests.Session.request")
@mock.patch("singer.utils.parse_args")
class TestCredentials(unittest.TestCase):
    """
    Test `verify_repo_access` error handling
    """

    config = {"access_token": "", "repository": "singer-io/tap-github"}

    def test_repo_bad_request(self, mocked_parse_args, mocked_request, mock_verify_access):
        """Verify if 400 error arises"""
        test_client = GithubClient(self.config)
        mocked_request.return_value = get_response(400, raise_error = True)

        with self.assertRaises(tap_github.client.BadRequestException) as e:
            test_client.verify_repo_access("", "repo")

        # Verify error with proper message
        self.assertEqual(str(e.exception), "HTTP-error-code: 400, Error: The request is missing or has a bad parameter.")

    def test_repo_bad_creds(self, mocked_parse_args, mocked_request, mock_verify_access):
        """Verify if 401 error arises"""
        test_client = GithubClient(self.config)
        json = {"message": "Bad credentials", "documentation_url": "https://docs.github.com/"}
        mocked_request.return_value = get_response(401, json, True)

        with self.assertRaises(tap_github.client.BadCredentialsException) as e:
            test_client.verify_repo_access("", "repo")

        # Verify error with proper message
        self.assertEqual(str(e.exception), "HTTP-error-code: 401, Error: {}".format(json))
