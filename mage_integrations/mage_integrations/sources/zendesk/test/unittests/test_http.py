import unittest
from unittest.mock import MagicMock, Mock, patch
from tap_zendesk import http, streams
import requests

import zenpy


class Mockresponse:
    def __init__(
        self, resp, status_code, content=[""], headers=None, raise_error=False, text={}
    ):
        self.json_data = resp
        self.status_code = status_code
        self.content = content
        self.headers = headers
        self.raise_error = raise_error
        self.text = text
        self.reason = "error"

    def prepare(self):
        return (
            self.json_data,
            self.status_code,
            self.content,
            self.headers,
            self.raise_error,
        )

    def raise_for_status(self):
        if not self.raise_error:
            return self.status_code

        raise requests.HTTPError("mock sample message")

    def json(self):
        return self.text


SINGLE_RESPONSE = {"meta": {"has_more": False}}

PAGINATE_RESPONSE = {"meta": {"has_more": True, "after_cursor": "some_cursor"}}

REQUEST_TIMEOUT = 300


def mocked_get(*args, **kwargs):
    fake_response = requests.models.Response()
    fake_response.headers.update(kwargs.get("headers", {}))
    fake_response.status_code = kwargs["status_code"]

    # We can't set the content or text of the Response directly, so we mock a function
    fake_response.json = Mock()
    fake_response.json.side_effect = lambda: kwargs.get("json", {})

    return fake_response


def mock_send_409(*args, **kwargs):
    return Mockresponse("", 409, raise_error=True)


@patch("time.sleep")
class TestBackoff(unittest.TestCase):
    """Test that we can make single requests to the API and handle cursor based pagination.

    Note: Because `get_cursor_based` is a generator, we have to consume it
    in the test before making assertions
    """

    @patch(
        "requests.get", side_effect=[mocked_get(status_code=200, json=SINGLE_RESPONSE)]
    )
    def test_get_cursor_based_gets_one_page(self, mock_get, mock_sleep):
        responses = [
            response
            for response in http.get_cursor_based(
                url="some_url",
                access_token="some_token",
                request_timeout=REQUEST_TIMEOUT,
            )
        ]
        actual_response = responses[0]
        self.assertDictEqual(SINGLE_RESPONSE, actual_response)

        expected_call_count = 1
        actual_call_count = mock_get.call_count
        self.assertEqual(expected_call_count, actual_call_count)

    @patch(
        "requests.get",
        side_effect=[
            mocked_get(status_code=200, json={"key1": "val1", **PAGINATE_RESPONSE}),
            mocked_get(status_code=200, json={"key2": "val2", **SINGLE_RESPONSE}),
        ],
    )
    def test_get_cursor_based_can_paginate(self, mock_get, mock_sleep):
        responses = [
            response
            for response in http.get_cursor_based(
                url="some_url",
                access_token="some_token",
                request_timeout=REQUEST_TIMEOUT,
            )
        ]

        self.assertDictEqual({"key1": "val1", **PAGINATE_RESPONSE}, responses[0])
        self.assertDictEqual({"key2": "val2", **SINGLE_RESPONSE}, responses[1])

        expected_call_count = 2
        actual_call_count = mock_get.call_count
        self.assertEqual(expected_call_count, actual_call_count)

    @patch(
        "requests.get",
        side_effect=[
            mocked_get(
                status_code=429,
                headers={"Retry-After": "1"},
                json={"key3": "val3", **SINGLE_RESPONSE},
            ),
            mocked_get(
                status_code=429,
                headers={"retry-after": 1},
                json={"key2": "val2", **SINGLE_RESPONSE},
            ),
            mocked_get(status_code=200, json={"key1": "val1", **SINGLE_RESPONSE}),
        ],
    )
    def test_get_cursor_based_handles_429(self, mock_get, mock_sleep):
        """Test that the tap:
        - can handle 429s
        - requests uses a case insensitive dict for the `headers`
        - can handle either a string or an integer for the retry header
        """
        responses = [
            response
            for response in http.get_cursor_based(
                url="some_url",
                access_token="some_token",
                request_timeout=REQUEST_TIMEOUT,
            )
        ]
        actual_response = responses[0]
        self.assertDictEqual({"key1": "val1", **SINGLE_RESPONSE}, actual_response)

        expected_call_count = 3
        actual_call_count = mock_get.call_count
        self.assertEqual(expected_call_count, actual_call_count)

    @patch(
        "requests.get", side_effect=[mocked_get(status_code=400, json={"key1": "val1"})]
    )
    def test_get_cursor_based_handles_400(self, mock_get, mock_sleep):
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]

        except http.ZendeskBadRequestError as e:
            expected_error_message = (
                "HTTP-error-code: 400, Error: A validation exception has occurred."
            )
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request calls only 1 time
        self.assertEqual(mock_get.call_count, 1)

    @patch(
        "requests.get",
        side_effect=[
            mocked_get(status_code=400, json={"error": "Couldn't authenticate you"})
        ],
    )
    def test_get_cursor_based_handles_400_api_error_message(self, mock_get, mock_sleep):
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]

        except http.ZendeskBadRequestError as e:
            expected_error_message = (
                "HTTP-error-code: 400, Error: Couldn't authenticate you"
            )
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request calls only 1 time
        self.assertEqual(mock_get.call_count, 1)

    @patch(
        "requests.get", side_effect=[mocked_get(status_code=401, json={"key1": "val1"})]
    )
    def test_get_cursor_based_handles_401(self, mock_get, mock_sleep):
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
        except http.ZendeskUnauthorizedError as e:
            expected_error_message = (
                "HTTP-error-code: 401, Error: The access token provided is expired, revoked,"
                " malformed or invalid for other reasons."
            )
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request calls only 1 time
        self.assertEqual(mock_get.call_count, 1)

    @patch(
        "requests.get", side_effect=[mocked_get(status_code=404, json={"key1": "val1"})]
    )
    def test_get_cursor_based_handles_404(self, mock_get, mock_sleep):
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
        except http.ZendeskNotFoundError as e:
            expected_error_message = "HTTP-error-code: 404, Error: The resource you have specified cannot be found."
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request calls only 1 time
        self.assertEqual(mock_get.call_count, 1)

    @patch("requests.get", side_effect=mock_send_409)
    def test_get_cursor_based_handles_409(self, mocked_request, mock_api_token):
        """
        Test that `request` method retry 409 error 10 times
        """

        with self.assertRaises(http.ZendeskConflictError) as e:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
            expected_error_message = "HTTP-error-code: 409, Error: The API request cannot be completed because the requested operation would conflict with an existing item."
            self.assertEqual(str(e), expected_error_message)

        # Verify that requests.Session.request called 10 times
        self.assertEqual(mocked_request.call_count, 10)

    @patch(
        "requests.get", side_effect=[mocked_get(status_code=422, json={"key1": "val1"})]
    )
    def test_get_cursor_based_handles_422(self, mock_get, mock_sleep):
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
        except http.ZendeskUnprocessableEntityError as e:
            expected_error_message = "HTTP-error-code: 422, Error: The request content itself is not processable by the server."
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request calls only 1 time
        self.assertEqual(mock_get.call_count, 1)

    @patch(
        "requests.get",
        side_effect=10 * [mocked_get(status_code=500, json={"key1": "val1"})],
    )
    def test_get_cursor_based_handles_500(self, mock_get, mock_sleep):
        """
        Test that the tap can handle 500 error and retry it 10 times
        """
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
        except http.ZendeskInternalServerError as e:
            expected_error_message = (
                "HTTP-error-code: 500, Error: The server encountered an unexpected condition which prevented"
                " it from fulfilling the request."
            )
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request retry 10 times
        self.assertEqual(mock_get.call_count, 10)

    @patch(
        "requests.get",
        side_effect=10 * [mocked_get(status_code=501, json={"key1": "val1"})],
    )
    def test_get_cursor_based_handles_501(self, mock_get, mock_sleep):
        """
        Test that the tap can handle 501 error and retry it 10 times
        """
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
        except http.ZendeskNotImplementedError as e:
            expected_error_message = "HTTP-error-code: 501, Error: The server does not support the functionality required to fulfill the request."
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request retry 10 times
        self.assertEqual(mock_get.call_count, 10)

    @patch(
        "requests.get",
        side_effect=10 * [mocked_get(status_code=502, json={"key1": "val1"})],
    )
    def test_get_cursor_based_handles_502(self, mock_get, mock_sleep):
        """
        Test that the tap can handle 502 error and retry it 10 times
        """
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
        except http.ZendeskBadGatewayError as e:
            expected_error_message = (
                "HTTP-error-code: 502, Error: Server received an invalid response."
            )
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request retry 10 times
        self.assertEqual(mock_get.call_count, 10)

    @patch("requests.get")
    def test_get_cursor_based_handles_444(self, mock_get, mock_sleep):
        fake_response = requests.models.Response()
        fake_response.status_code = 444

        mock_get.side_effect = [fake_response]
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
        except http.ZendeskError as e:
            expected_error_message = "HTTP-error-code: 444, Error: Unknown Error"
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        self.assertEqual(mock_get.call_count, 1)

    @patch("tap_zendesk.streams.LOGGER.warning")
    def test_raise_or_log_zenpy_apiexception(self, mocked_logger, mock_sleep):
        schema = {}
        stream = "test_stream"
        error_string = '{"error": "Forbidden", "description": "You are missing the following required scopes: read"}'
        e = zenpy.lib.exception.APIException(error_string)
        streams.raise_or_log_zenpy_apiexception(schema, stream, e)
        # Verify the raise_or_log_zenpy_apiexception Log expected message
        mocked_logger.assert_called_with(
            "The account credentials supplied do not have access to `%s` custom fields.",
            stream,
        )

    @patch("requests.get")
    def test_call_api_handles_timeout_error(self, mock_get, mock_sleep):
        mock_get.side_effect = requests.exceptions.Timeout

        try:
            responses = http.call_api(
                url="some_url", request_timeout=300, params={}, headers={}
            )
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout
        self.assertEqual(mock_get.call_count, 5)

    @patch("requests.get")
    def test_call_api_handles_connection_error(self, mock_get, mock_sleep):
        mock_get.side_effect = ConnectionError

        try:
            responses = http.call_api(
                url="some_url", request_timeout=300, params={}, headers={}
            )
        except ConnectionError as e:
            pass

        # Verify the request retry 5 times on timeout
        self.assertEqual(mock_get.call_count, 5)

    @patch(
        "requests.get",
        side_effect=10 * [mocked_get(status_code=524, json={"key1": "val1"})],
    )
    def test_get_cursor_based_handles_524(self, mock_get, mock_sleep):
        """
        Test that the tap can handle 524 error and retry it 10 times
        """
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
        except http.ZendeskError as e:
            expected_error_message = "HTTP-error-code: 524, Error: Unknown Error"
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request retry 10 times
        self.assertEqual(mock_get.call_count, 10)

    @patch(
        "requests.get",
        side_effect=10 * [mocked_get(status_code=520, json={"key1": "val1"})],
    )
    def test_get_cursor_based_handles_520(self, mock_get, mock_sleep):
        """
        Test that the tap can handle 520 error and retry it 10 times
        """
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
        except http.ZendeskError as e:
            expected_error_message = "HTTP-error-code: 520, Error: Unknown Error"
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request retry 10 times
        self.assertEqual(mock_get.call_count, 10)

    @patch(
        "requests.get",
        side_effect=10 * [mocked_get(status_code=503, json={"key1": "val1"})],
    )
    def test_get_cursor_based_handles_503(self, mock_get, mock_sleep):
        """
        Test that the tap can handle 503 error and retry it 10 times
        """
        try:
            responses = [
                response
                for response in http.get_cursor_based(
                    url="some_url", access_token="some_token", request_timeout=300
                )
            ]
        except http.ZendeskServiceUnavailableError as e:
            expected_error_message = (
                "HTTP-error-code: 503, Error: API service is currently unavailable."
            )
            # Verify the message formed for the custom exception
            self.assertEqual(str(e), expected_error_message)

        # Verify the request retry 10 times
        self.assertEqual(mock_get.call_count, 10)
