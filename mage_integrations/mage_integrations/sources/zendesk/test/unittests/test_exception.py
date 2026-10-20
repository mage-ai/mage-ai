import unittest
from tap_zendesk import  get_session
from unittest import mock
from pytest import raises
from tap_zendesk.streams import raise_or_log_zenpy_apiexception, zenpy, json, LOGGER

class ValueError(Exception):
    def __init__(self, m):
        self.message = m

    def __str__(self):
        return self.message


class TestException(unittest.TestCase):
    @mock.patch("tap_zendesk.streams.LOGGER.warning")
    def test_exception_logger(self, mocked_logger):
        """
        Test whether the specific logger message is correctly printed when access error occurs and the error is a dict
        """
        schema = {}
        stream = 'test_stream'
        error_string = '{"error":{"message": "You do not have access to this page. Please contact the account owner of this help desk for further help."}' + "}"
        e = zenpy.lib.exception.APIException(error_string)
        raise_or_log_zenpy_apiexception(schema, stream, e)
        mocked_logger.assert_called_with(
            "The account credentials supplied do not have access to `%s` custom fields.",
            stream)
        
    def test_zenpy_exception_raised(self):
        """
        Test whether the no logger message is printed in case of errors other then access error and the exception is raised
        """
        try:
            schema = {}
            stream = 'test_stream'
            error_string = '{"error": "invalid_token", "error_description": "The access token provided is expired, revoked, malformed or invalid for other reasons."}'
            e = zenpy.lib.exception.APIException(error_string)
            raise_or_log_zenpy_apiexception(schema, stream, e)
        except zenpy.lib.exception.APIException as ex:
            self.assertEqual(str(ex), error_string)

        
    def test_zenpy_exception_but_different_message_raised(self):
        """
        Test whether the exception is raised when the error is a dict but with different error message
        """
        try:
            schema = {}
            stream = 'test_stream'
            error_string = '{"error":{"message": "Could not authenticate you"}' + "}"
            e = zenpy.lib.exception.APIException(error_string)
            raise_or_log_zenpy_apiexception(schema, stream, e)
        except zenpy.lib.exception.APIException as ex:
            self.assertEqual(str(ex), error_string)
