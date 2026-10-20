import unittest
import tap_hubspot
from tap_hubspot import get_start
from tap_hubspot import singer

def get_state(key,value):
    """
    Returns a mock state
    """
    return {
        "bookmarks": {
            "stream_id_1": {
                "offset": {},
                key: value
                }
            }
        }

class TestGetStart(unittest.TestCase):
    """
    Verify return value of `get_start` function.
    """
    def test_get_start_without_state(self):
        """
        This test verifies that `get_start` function returns start_date from CONFIG
        if an empty state is passed.
        """
        mock_state = {}
        expected_value = tap_hubspot.CONFIG["start_date"]
        returned_value = get_start(mock_state, "stream_id_1", "current_bookmark", "old_bookmark")

        # Verify that returned value is start_date
        self.assertEqual(returned_value, expected_value)

    def test_get_start_with_old_bookmark(self):
        """
        This test verifies that the `get_start` function returns old_bookmark from the state
        if current_bookmark is not available in the state.
        """
        mock_state = get_state("old_bookmark", "OLD_BOOKMARK_VALUE")
        expected_value = "OLD_BOOKMARK_VALUE"

        returned_value = get_start(mock_state, "stream_id_1", "current_bookmark", "old_bookmark")

        # Verify that returned value is old_bookmark_value
        self.assertEqual(returned_value, expected_value)

    def test_get_start_with_current_bookmark_and_no_old_bookmark(self):
        """
        This test verifies that the `get_start` function returns current_bookmark from the state
        if current_bookmark is available in the state and old_bookmark is not given.
        """
        mock_state = get_state("current_bookmark", "CURR_BOOKMARK_VALUE")
        expected_value = "CURR_BOOKMARK_VALUE"

        returned_value = get_start(mock_state, "stream_id_1", "current_bookmark")

        # Verify that returned value is current bookmark
        self.assertEqual(returned_value, expected_value)

    def test_get_start_with_empty_start__no_old_bookmark(self):
        """
        This test verifies that the `get_start` function returns start_date from CONFIG
        if an empty state is passed and old_bookamrk is not given.
        """
        mock_state = {}
        expected_value = tap_hubspot.CONFIG["start_date"]

        returned_value = get_start(mock_state, "stream_id_1", "current_bookmark")

        # Verify that returned value is start_date
        self.assertEqual(returned_value, expected_value)

    def test_get_start_with_both_bookmark(self):
        """
        This test verifies that the `get_start` function returns current_bookmark from the state
        if both old and current bookmark is available in the state.
        """

        mock_state = {
            "bookmarks": {
                "stream_id_1": {
                    "offset": {},
                    "old_bookmark": "OLD_BOOKMARK_VALUE",
                    "current_bookmark": "CURR_BOOKMARK_VALUE"
                    }
                }
            }
        expected_value = "CURR_BOOKMARK_VALUE"

        returned_value = get_start(mock_state, "stream_id_1", "current_bookmark", "old_bookmark")

        # Verify that returned value is current bookmark
        self.assertEqual(returned_value, expected_value)
