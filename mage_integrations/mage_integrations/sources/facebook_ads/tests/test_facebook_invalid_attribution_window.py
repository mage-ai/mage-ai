import os
import unittest

from tap_tester import runner, connections, menagerie

from base import FacebookBaseTest

class FacebookInvalidAttributionWindowInt(FacebookBaseTest):

    @staticmethod
    def name():
        return "tt_facebook_invalid_window_int"

    @staticmethod
    def streams_to_test():
        return []

    def get_properties(self, original: bool = True):
        """Configuration properties required for the tap."""
        return_value = {
            'account_id': os.getenv('TAP_FACEBOOK_ACCOUNT_ID'),
            'start_date' : '2019-07-24T00:00:00Z',
            'end_date' : '2019-07-26T00:00:00Z',
            'insights_buffer_days': self.ATTRIBUTION_WINDOW,
        }
        if original:
            return return_value

        return_value["start_date"] = self.start_date
        return return_value

    def test_run(self):
        self.ATTRIBUTION_WINDOW = '10' # set attribution window other than 1, 7 or 28
        self.run_test()

    def run_test(self):
        """
        Test to verify that the error is raise when passing attribution window other than 1, 7 or 28
        """
        # create connection
        conn_id = connections.ensure_connection(self)
        # run check mode
        check_job_name = runner.run_check_mode(self, conn_id)
        # get exit status
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        # get discovery error message
        discovery_error_message = exit_status.get('discovery_error_message')
        # validate the error message
        self.assertEquals(discovery_error_message, "The attribution window must be 1, 7 or 28.")
        self.assertIsNone(exit_status.get('target_exit_status'))
        self.assertIsNone(exit_status.get('tap_exit_status'))


class FacebookInvalidAttributionWindowStr(FacebookInvalidAttributionWindowInt):

    @staticmethod
    def name():
        return "tt_facebook_invalid_window_str"
    
    @unittest.skip("BUG: TDL-18569")
    def test_run(self):
        self.ATTRIBUTION_WINDOW = 'something'
        self.run_test()

    # BUG : TDL-18569 created to standarize the error message for sting values for attribution window
