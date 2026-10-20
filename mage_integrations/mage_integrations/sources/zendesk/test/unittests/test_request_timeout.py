import unittest
from unittest.mock import MagicMock, Mock, patch
from tap_zendesk import http, streams
import requests
import datetime

PAGINATE_RESPONSE = {
    'meta': {'has_more': True,
             'after_cursor': 'some_cursor'},
    'end_of_stream': False,
    'after_cursor': 'some_cursor',
    'next_page': '3'
}
REQUEST_TIMEOUT = 300
REQUEST_TIMEOUT_STR = "300"
REQUEST_TIMEOUT_FLOAT = 300.05

SINGLE_RESPONSE = {
    'meta': {'has_more': False}
}

START_TIME = datetime.datetime.strptime("2021-10-30T00:00:00Z", "%Y-%m-%dT%H:%M:%SZ")
def mocked_get(*args, **kwargs):
    fake_response = requests.models.Response()
    fake_response.headers.update(kwargs.get('headers', {}))
    fake_response.status_code = kwargs['status_code']

    # We can't set the content or text of the Response directly, so we mock a function
    fake_response.json = Mock()
    fake_response.json.side_effect = lambda:kwargs.get('json', {})

    return fake_response

@patch("time.sleep")
class TestRequestTimeoutBackoff(unittest.TestCase):
    """
    A set of unit tests to ensure that requests are retrying properly for Timeout Error.
    """   

    @patch('requests.get')
    def test_call_api_handles_timeout_error(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times,
        """
        mock_get.side_effect = requests.exceptions.Timeout

        try:
            responses = http.call_api(url='some_url', request_timeout=300, params={}, headers={})
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get', side_effect=5*[requests.exceptions.Timeout])
    def test_get_cursor_based_handles_timeout_error(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times,
        """

        try:
            responses = [response for response in http.get_cursor_based(url='some_url',
                                                                    access_token='some_token', request_timeout=REQUEST_TIMEOUT)]
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
    
    @patch('requests.get', side_effect=[mocked_get(status_code=200, json={"key1": "val1", **PAGINATE_RESPONSE}),
                                        requests.exceptions.Timeout, requests.exceptions.Timeout, 
                                        mocked_get(status_code=200, json={"key1": "val1", **SINGLE_RESPONSE})])
    def test_get_cursor_based_handles_timeout_error_in_pagination_call(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout`. In next page call the tap should retry request timeout error.
        """

        try:
            responses = [response for response in http.get_cursor_based(url='some_url',
                                                                    access_token='some_token', request_timeout=REQUEST_TIMEOUT)]
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request call total 4 times(2 time retry call, 2 time 200 call)
        self.assertEqual(mock_get.call_count, 4)
        
    @patch('requests.get', side_effect=5*[requests.exceptions.Timeout])
    def test_get_offset_based_handles_timeout_error(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times,
        """
        
        try:
            responses = [response for response in http.get_offset_based(url='some_url',
                                                                    access_token='some_token', request_timeout=REQUEST_TIMEOUT)]
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get', side_effect=[mocked_get(status_code=200, json={"key1": "val1", **PAGINATE_RESPONSE}),
                                        requests.exceptions.Timeout, requests.exceptions.Timeout, 
                                        mocked_get(status_code=200, json={"key1": "val1", **SINGLE_RESPONSE})])
    def test_get_offset_based_handles_timeout_error_in_pagination_call(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout`. In next page call the tap should retry request timeout error.
        """

        try:
            responses = [response for response in http.get_offset_based(url='some_url',
                                                                    access_token='some_token', request_timeout=REQUEST_TIMEOUT)]
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request call total 4 times(2 time retry call, 2 time 200 call)
        self.assertEqual(mock_get.call_count, 4)
        
    @patch('requests.get', side_effect=5*[requests.exceptions.Timeout])
    def test_get_incremental_export_handles_timeout_error(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times,
        """

        try:
            responses = [response for response in http.get_incremental_export(url='some_url',access_token='some_token', 
                                                                              request_timeout=REQUEST_TIMEOUT, start_time= datetime.datetime.utcnow())]
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_cursor_based_stream_timeout_error_without_parameter(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when `request_timeout` does not passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_stream = streams.CursorBasedStream(config={'subdomain': '34', 'access_token': 'df'})
        cursor_based_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_stream.get_objects())
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_cursor_based_stream_timeout_error_with_zero_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when string "0" value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_stream = streams.CursorBasedStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': "0"})
        cursor_based_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_stream.get_objects())
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)

    @patch('requests.get')
    def test_cursor_based_stream_timeout_error_with_zero_int_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int 0 value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_stream = streams.CursorBasedStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': 0})
        cursor_based_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_stream.get_objects())
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_cursor_based_stream_timeout_error_with_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when string value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_stream = streams.CursorBasedStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_STR})
        cursor_based_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_stream.get_objects())
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
    
    @patch('requests.get')
    def test_cursor_based_stream_timeout_error_with_int_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_stream = streams.CursorBasedStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT})
        cursor_based_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_stream.get_objects())
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_cursor_based_stream_timeout_error_with_float_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when float value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_stream = streams.CursorBasedStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_FLOAT})
        cursor_based_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_stream.get_objects())
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
    @patch('requests.get')
    def test_cursor_based_stream_timeout_error_with_empty_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when empty value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_stream = streams.CursorBasedStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': ''})
        cursor_based_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_stream.get_objects())
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
    @patch('requests.get')
    def test_cursor_based_export_stream_timeout_error_without_parameter(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when `request_timeout` does not passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_export_stream = streams.CursorBasedExportStream(config={'subdomain': '34', 'access_token': 'df'})
        cursor_based_export_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_export_stream.get_objects(datetime.datetime.utcnow()))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)

    @patch('requests.get')
    def test_cursor_based_export_stream_timeout_error_with_zero_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when stiring "0" value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_export_stream = streams.CursorBasedExportStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': '0'})
        cursor_based_export_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_export_stream.get_objects(datetime.datetime.utcnow()))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)

    @patch('requests.get')
    def test_cursor_based_export_stream_timeout_error_with_zero_int_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int 0 value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_export_stream = streams.CursorBasedExportStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': 0})
        cursor_based_export_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_export_stream.get_objects(datetime.datetime.utcnow()))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
    
    @patch('requests.get')
    def test_cursor_based_export_stream_timeout_error_with_empty_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when empty value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_export_stream = streams.CursorBasedExportStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': ''})
        cursor_based_export_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_export_stream.get_objects(datetime.datetime.utcnow()))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
    
    @patch('requests.get')
    def test_cursor_based_export_stream_timeout_error_with_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when string value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_export_stream = streams.CursorBasedExportStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_STR})
        cursor_based_export_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_export_stream.get_objects(datetime.datetime.utcnow()))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_cursor_based_export_stream_timeout_error_with_int_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_export_stream = streams.CursorBasedExportStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT})
        cursor_based_export_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_export_stream.get_objects(datetime.datetime.utcnow()))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_cursor_based_export_stream_timeout_error_with_float_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when float value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        cursor_based_export_stream = streams.CursorBasedExportStream(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_FLOAT})
        cursor_based_export_stream.endpoint = 'https://{}'
        try:
            responses = list(cursor_based_export_stream.get_objects(datetime.datetime.utcnow()))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_audits_timeout_error_without_parameter(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when `request_timeout` does not passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_audits = streams.TicketAudits(config={'subdomain': '34', 'access_token': 'df'})
        try:
            responses = list(ticket_audits.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)

    @patch('requests.get')
    def test_ticket_audits_timeout_error_with_zero_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when string "0" value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_audits = streams.TicketAudits(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': "0"})
        try:
            responses = list(ticket_audits.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_audits_timeout_error_with_zero_int_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int 0 value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_audits = streams.TicketAudits(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': 0})
        try:
            responses = list(ticket_audits.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
    
    @patch('requests.get')
    def test_ticket_audits_timeout_error_with_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when string value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_audits = streams.TicketAudits(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_STR})
        try:
            responses = list(ticket_audits.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_audits_timeout_error_with_int_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_audits = streams.TicketAudits(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT})
        try:
            responses = list(ticket_audits.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_audits_timeout_error_with_float_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when float value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_audits = streams.TicketAudits(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_FLOAT})
        try:
            responses = list(ticket_audits.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_audits_timeout_error_with_empty_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when empty value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_audits = streams.TicketAudits(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_STR})
        try:
            responses = list(ticket_audits.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)

    @patch('requests.get')
    def test_ticket_metrics_timeout_error_with_empty_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when empty value of `request_timeout` passed,s
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_metrics = streams.TicketMetrics(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': ''})
        try:
            responses = list(ticket_metrics.sync('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_metrics_timeout_error_without_parameter(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when `request_timeout` does not passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_metrics = streams.TicketMetrics(config={'subdomain': '34', 'access_token': 'df'})
        try:
            responses = list(ticket_metrics.sync('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)

    @patch('requests.get')
    def test_ticket_metrics_timeout_error_with_zero_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when string "0" value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_metrics = streams.TicketMetrics(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': "0"})
        try:
            responses = list(ticket_metrics.sync('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_metrics_timeout_error_with_zero_int_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int 0 value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_metrics = streams.TicketMetrics(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': 0})
        try:
            responses = list(ticket_metrics.sync('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_metrics_timeout_error_with_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when string value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_metrics = streams.TicketMetrics(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_STR})
        try:
            responses = list(ticket_metrics.sync('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_metrics_timeout_error_with_int_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_metrics = streams.TicketMetrics(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT})
        try:
            responses = list(ticket_metrics.sync('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_metrics_timeout_error_with_float_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_metrics = streams.TicketMetrics(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_FLOAT})
        try:
            responses = list(ticket_metrics.sync('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_comments_timeout_error_without_parameter(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when `request_timeout` does not passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_comments = streams.TicketComments(config={'subdomain': '34', 'access_token': 'df'})
        try:
            responses = list(ticket_comments.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_comments_timeout_error_with_empty_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when empty value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_comments = streams.TicketComments(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': ''})
        try:
            responses = list(ticket_comments.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)

    @patch('requests.get')
    def test_ticket_comments_timeout_error_with_zero_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when string "0" value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_comments = streams.TicketComments(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': "0"})
        try:
            responses = list(ticket_comments.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_comments_timeout_error_with_int_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int 0 value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_comments = streams.TicketComments(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': 0})
        try:
            responses = list(ticket_comments.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_comments_timeout_error_with_str_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when string value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_comments = streams.TicketComments(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_STR})
        try:
            responses = list(ticket_comments.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
        
    @patch('requests.get')
    def test_ticket_comments_timeout_error_with_float_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when float value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_comments = streams.TicketComments(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT_FLOAT})
        try:
            responses = list(ticket_comments.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
    
    @patch('requests.get')
    def test_ticket_comments_timeout_error_with_int_value(self, mock_get, mock_sleep):
        """We mock request method to raise a `Timeout` and expect the tap to retry this up to 5 times when int value of `request_timeout` passed,
        """
        mock_get.side_effect = requests.exceptions.Timeout
        ticket_comments = streams.TicketComments(config={'subdomain': '34', 'access_token': 'df', 'request_timeout': REQUEST_TIMEOUT})
        try:
            responses = list(ticket_comments.get_objects('i1'))
        except requests.exceptions.Timeout as e:
            pass

        # Verify the request retry 5 times on timeout 
        self.assertEqual(mock_get.call_count, 5)
