import unittest
import tap_facebook.__init__ as tap_facebook

class TestAttributionWindow(unittest.TestCase):
    """
        Test case to verify that proper error message is raise
        when user enters attribution window other than 1, 7 and 28
    """

    def test_invalid_attribution_window(self):
        error_message = None

        # set config
        tap_facebook.CONFIG = {
            "start_date": "2019-01-01T00:00:00Z",
            "account_id": "test_account_id",
            "access_token": "test_access_token",
            "insights_buffer_days": 30
        }

        try:
            # initialize 'AdsInsights' stream as attribution window is only supported in those streams
            tap_facebook.AdsInsights("test", "test", "test", None, {}, {})
        except Exception as e:
            # save error message for assertion
            error_message = str(e)

        # verify the error message was as expected
        self.assertEquals(error_message, "The attribution window must be 1, 7 or 28.")
