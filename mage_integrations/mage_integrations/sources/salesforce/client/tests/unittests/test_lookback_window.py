from tap_salesforce.salesforce import Salesforce
import unittest

start_date = "2022-05-02T00:00:00.000000Z"
bookmark = "2022-05-23T00:00:00.000000Z"

catalog_entry = {
    "tap_stream_id": "Test",
    "metadata": [
        {
            "breadcrumb": [],
            "metadata": {
                "replication-method": "INCREMENTAL",
                "replication-key": "SystemModstamp"
            }
        }
    ]
}

TEST_STATE = {
    "bookmarks": {
        "Test": {
            "SystemModstamp": bookmark
        }
    }
}

TEST_LOOKBACK_WINDOW = 60


class SalesforceGetStartDateTests(unittest.TestCase):
    """Test all of the combinations of having a bookmark or not and a
    lookback_window or not

    These tests set up a minimal `Salesforce` object and call
    `Salesforce.get_start_date()` for each of the following scenarios

    | Has Lookback | Has bookmark | Expectation       |
    |--------------+--------------+-------------------|
    | No           | No           | start date        |
    | No           | Yes          | bookmark          |
    | Yes          | No           | start date        |
    | Yes          | Yes          | adjusted bookmark |
    """
    def test_no_lookback_no_bookmark_returns_start_date(self):
        sf_obj = Salesforce(
            default_start_date=start_date
        )

        expected = start_date
        actual = sf_obj.get_start_date(
            {},
            catalog_entry
        )

        self.assertEqual(expected, actual)

    def test_no_lookback_yes_bookmark_returns_bookmark(self):
        sf_obj = Salesforce(
            default_start_date=start_date
        )

        expected = bookmark
        actual = sf_obj.get_start_date(
            TEST_STATE,
            catalog_entry
        )

        self.assertEqual(expected, actual)

    def test_yes_lookback_no_bookmark_returns_start_date(self):
        sf_obj = Salesforce(
            default_start_date=start_date,
            lookback_window=TEST_LOOKBACK_WINDOW,
        )

        expected = start_date
        actual = sf_obj.get_start_date(
            {},
            catalog_entry
        )

        self.assertEqual(expected, actual)

    def test_yes_lookback_yes_bookmark_returns_adjusted_bookmark(self):
        sf_obj = Salesforce(
            default_start_date=start_date,
            lookback_window=TEST_LOOKBACK_WINDOW
        )

        expected = "2022-05-22T23:59:00.000000Z"
        actual = sf_obj.get_start_date(
            TEST_STATE,
            catalog_entry
        )

        self.assertEqual(expected, actual)
