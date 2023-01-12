import unittest
from unittest.mock import patch
from tap_zendesk import streams, http


class MockClass:
    def is_selected(self):
        return True
    
    def sync(self, ticket_id):
        raise http.ZendeskNotFoundError

@patch("tap_zendesk.streams.LOGGER.warning")
@patch('tap_zendesk.streams.Stream.update_bookmark')
@patch('tap_zendesk.metrics.capture')
@patch('tap_zendesk.streams.CursorBasedExportStream.get_objects')
@patch('tap_zendesk.streams.Stream.get_bookmark')
class TestSkip404Error(unittest.TestCase):
    """
    Test that child stream of tickets - ticket_audits, ticket_metrics, ticket_comments skip the 404 error.
    To raise the 404 error some of the method including _empty_buffer, LOGGER.warning, _buffer_record, update_bookmark,
    metrics.capture, get_objects, get_bookmark mocked.
    """
    @patch('tap_zendesk.streams.TicketAudits')
    def test_ticket_audits_skip_404_error(self, mock_ticket_audits, mock_get_bookmark, mock_get_object, mock_metrics, 
                                          mock_update_bookmark, mock_logger):
       
        '''
        Test that ticket_audits stream skip the 404 error
        '''
        mock_ticket_audits.return_value = MockClass()
        mock_get_object.return_value = [{'generated_timestamp': 12457845, 'fields': {}, 'id': 'i1'}]
        tickets = streams.Tickets(config={'subdomain': '34', 'access_token': 'df'})

        try:
            responses = list(tickets.sync(state={}))
        except AttributeError:
            pass
        
        # verify if the LOGGER.warning was called and verify the message
        mock_logger.assert_called_with("Unable to retrieve audits for ticket (ID: i1), record not found")
    
    @patch('tap_zendesk.streams.TicketComments')
    def test_ticket_comments_skip_404_error(self, mock_ticket_comments, mock_get_bookmark, mock_get_object, mock_metrics, 
                                          mock_update_bookmark, mock_logger):

        '''
        Test that ticket_audits stream skip the 404 error
        '''
        mock_ticket_comments.return_value = MockClass()
        mock_get_object.return_value = [{'generated_timestamp': 12457845, 'fields': {}, 'id': 'i1'}]
        tickets = streams.Tickets(config={'subdomain': '34', 'access_token': 'df'})

        try:
            responses = list(tickets.sync(state={}))
        except AttributeError:
            pass
        
        # verify if the LOGGER.warning was called and verify the message
        mock_logger.assert_called_with("Unable to retrieve comments for ticket (ID: i1), record not found")
        
    @patch('tap_zendesk.streams.TicketMetrics')
    def test_ticket_metrics_skip_404_error(self, mock_ticket_metrics, mock_get_bookmark, mock_get_object, mock_metrics, 
                                          mock_update_bookmark, mock_logger):
       
        '''
        Test that ticket_audits stream skip the 404 error
        '''
        mock_ticket_metrics.return_value = MockClass()
        mock_get_object.return_value = [{'generated_timestamp': 12457845, 'fields': {}, 'id': 'i1'}]
        tickets = streams.Tickets(config={'subdomain': '34', 'access_token': 'df'})

        try:
            responses = list(tickets.sync(state={}))
            self.assertEqual(responses, 1)
        except AttributeError:
            pass
        
        # verify if the LOGGER.warning was called and verify the message
        mock_logger.assert_called_with("Unable to retrieve metrics for ticket (ID: i1), record not found")

            
