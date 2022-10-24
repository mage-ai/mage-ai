import datetime
import unittest
from unittest import mock
from tap_salesforce import Salesforce
from tap_salesforce.salesforce import Bulk
from dateutil import tz
import singer

# function to return batch status as 'failed' to force date windowing
def mocked_batch_status(count):
    if count < 2:
        return {"failed": "test"}
    else:
        return {"failed": {}}

@mock.patch('tap_salesforce.salesforce.Bulk._close_job')
@mock.patch('tap_salesforce.salesforce.Bulk._poll_on_pk_chunked_batch_status', side_effect = mocked_batch_status)
@mock.patch('tap_salesforce.salesforce.Bulk._create_job', side_effect=[1, 2, 3, 4, 5])
@mock.patch('tap_salesforce.salesforce.bulk.singer_utils.now')
class TestBulkDateWindow(unittest.TestCase):

    # start date
    start_date = '2019-02-04T12:15:00Z'
    # 'Salesforce' object
    sf = Salesforce(
        default_start_date=start_date,
        api_type="BULK")
    # dummy catalog entry
    catalog_entry = {
        'stream': 'User',
        'tap_stream_id': 'User',
        'schema': {
            "properties": {
                "Id": {
                    "type": "string"
                },
                "SystemModstamp": {
                    "anyOf": [{
                            "type": "string",
                            "format": "date-time"
                        },
                        {
                            "type": [
                                "string",
                                "null"
                            ]
                        }
                    ]
                }
            }
        },
        'metadata': [
            {
                "breadcrumb": [],
                "metadata": {
                    "selected": True,
                    "replication-key": "SystemModstamp",
                    "table-key-properties": [
                        "Id"
                    ]
                }
            },
            {
                "breadcrumb": [
                    "properties",
                    "SystemModstamp"
                ],
                "metadata": {
                    "inclusion": "automatic"
                }
            },
            {
                "breadcrumb": [
                    "properties",
                    "Id"
                ],
                "metadata": {
                    "inclusion": "automatic"
                }
            }
        ]
    }

    # mocked now date
    now_date_1 = datetime.datetime(2022, 5, 2, 12, 15, 00, tzinfo=tz.UTC)
    now_date_1_str = now_date_1.strftime("%Y-%m-%dT%H:%M:%SZ")

    # mocked now date
    now_date_2 = datetime.datetime(2019, 2, 5, 12, 15, 00, tzinfo=tz.UTC)

    @mock.patch('tap_salesforce.salesforce.Bulk._add_batch')
    def test_bulk_date_windowing_with_max_retries_0(self, mocked_add_batch, mocked_singer_util_now, mocked_create_job, mocked_batch_status, mocked_close_job):
        """
        To verify that if data is too large then date windowing mechanism execute, 
        but after retrying upto MAX_RETRIES still not get data then raise proper exception
        """

        mocked_singer_util_now.return_value = self.now_date_1

        with self.assertRaises(Exception) as e:
            Bulk(self.sf)._bulk_with_window([], self.catalog_entry, self.start_date, retries=0)

        self.assertEqual(str(e.exception), 'Ran out of retries attempting to query Salesforce Object User', "Not get expected Exception")

    @mock.patch('tap_salesforce.salesforce.Bulk._add_batch')
    def test_bulk_date_windowing_with_half_day_range_0(self, mocked_add_batch, mocked_singer_util_now, mocked_create_job, mocked_batch_status, mocked_close_job):
        """
        To verify that if data is too large then date windowing mechanism execute, 
        but after retrying window goes to 0 days, still not get data then raise proper exception
        """

        mocked_singer_util_now.return_value = self.now_date_2

        with self.assertRaises(Exception) as e:
            Bulk(self.sf)._bulk_with_window([], self.catalog_entry, self.start_date)

        self.assertEqual(str(e.exception), 'Attempting to query by 0 day range, this would cause infinite looping.', "Not get expected Exception")

    @mock.patch('xmltodict.parse')
    @mock.patch('tap_salesforce.salesforce.Salesforce._make_request')
    def test_bulk_date_window_gaps(self, mocked_make_request, mocked_xmltodict_parse, mocked_singer_util_now, mocked_create_job, mocked_batch_status, mocked_close_job):
        """
        Test case to verify there are no gaps in the date window
        """

        # mock singer.now
        mocked_singer_util_now.return_value = self.now_date_1
        # mock xmltodict.parse
        mocked_xmltodict_parse.return_value = {
            "batchInfo": {
                "id": 1234
            }
        }

        # function call with start date
        Bulk(self.sf)._bulk_with_window([], self.catalog_entry, self.start_date)

        # collect 'body' (query) from '_make_request' function arguments
        actual_queries = [kwargs.get("body") for args, kwargs in mocked_make_request.call_args_list]

        # calculate half window date for assertion
        half_day = (self.now_date_1 - singer.utils.strptime_with_tz(self.start_date)) // 2
        half_window_date = (self.now_date_1 - half_day).strftime('%Y-%m-%dT%H:%M:%SZ')

        # create expected queries
        expected_queries = [
            # failed call of whole date window ie. start date to now date
            f'SELECT Id,SystemModstamp FROM User WHERE SystemModstamp >= {self.start_date}  AND SystemModstamp < {self.now_date_1_str}',
            # date window divided into half, query from start date to half window
            f'SELECT Id,SystemModstamp FROM User WHERE SystemModstamp >= {self.start_date}  AND SystemModstamp < {half_window_date}',
            # query from half window to now date
            f'SELECT Id,SystemModstamp FROM User WHERE SystemModstamp >= {half_window_date}  AND SystemModstamp < {self.now_date_1_str}'
        ]

        # verify we called '_make_request' 3 times
        self.assertEqual(mocked_make_request.call_count, 3, "Function is not called expected times")
        # verify the queries are called as expected
        self.assertEqual(actual_queries, expected_queries)
