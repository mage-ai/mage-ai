import unittest
from unittest import mock
from tap_salesforce import Salesforce, metrics
from tap_salesforce.sync import sync_records
import json

class TestNullBookmarkTesting(unittest.TestCase):
    @mock.patch('tap_salesforce.salesforce.Salesforce.query', side_effect=lambda test1, test2: [])
    def test_not_null_bookmark_for_incremental_stream(self, mocked_query):
        """
        To ensure that after resolving write bookmark logic not get "Null" as replication key in state file, 
        When we have selected incremental stream as Full table stream

        """
        sf = Salesforce(default_start_date='2019-02-04T12:15:00Z', api_type="BULK")

        sf.pk_chunking = True
        catalog_entry = {"stream": "OpportunityLineItem", "schema": {}, "metadata":[], "tap_stream_id": "OpportunityLineItem"}
        state = {}
        counter = metrics.record_counter('OpportunityLineItem')
        sync_records(sf, catalog_entry, state, counter)
        # write state function convert python dictionary to json string
        state = json.dumps(state)
        self.assertEqual(state, '{"bookmarks": {"OpportunityLineItem": {"version": null}}}', "Not get expected state value")