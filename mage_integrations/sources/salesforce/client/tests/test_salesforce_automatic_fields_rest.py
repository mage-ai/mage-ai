"""
Test that with no fields selected for a stream automatic fields are still replicated
"""
import unittest
from datetime import datetime, timedelta

from tap_tester import runner, connections

from base import SalesforceBaseTest


class SalesforceAutomaticFields(SalesforceBaseTest):
    """Test that with no fields selected for a stream automatic fields are still replicated"""

    start_date =  (datetime.now() + timedelta(days=-1)).strftime("%Y-%m-%dT00:00:00Z")

    @staticmethod
    def expected_sync_streams():
        return {
            'Account',
            'Contact',
            'Lead',
            'Opportunity',
            'User',
        }

    def automatic_fields_test(self):
        """
        Verify that for each stream you can get multiple pages of data
        when no fields are selected and only the automatic fields are replicated.

        PREREQUISITE
        For EACH stream add enough data that you surpass the limit of a single
        fetch of data.  For instance if you have a limit of 250 records ensure
        that 251 (or more) records have been posted for that stream.
        """

        expected_streams = self.expected_sync_streams()

        # instantiate connection
        conn_id = connections.ensure_connection(self, original_properties=False)

        # run check mode
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # table and field selection
        test_catalogs_automatic_fields = [catalog for catalog in found_catalogs
                                          if catalog.get('stream_name') in expected_streams]

        self.perform_and_verify_table_and_field_selection(
            conn_id, test_catalogs_automatic_fields, select_all_fields=False,
        )

        # run initial sync
        record_count_by_stream = self.run_and_verify_sync(conn_id)
        synced_records = runner.get_records_from_target_output()

        for stream in expected_streams:
            with self.subTest(stream=stream):

                # expected values
                expected_keys = self.expected_automatic_fields().get(stream)

                # collect actual values
                data = synced_records.get(stream)
                record_messages_keys = [set(row['data'].keys()) for row in data['messages']
                                        if row['action'] == 'upsert']


                # Verify that you get some records for each stream
                self.assertGreater(
                    record_count_by_stream.get(stream, -1), 0,
                    msg="The number of records is not over the stream max limit")

                # Verify that only the automatic fields are sent to the target
                for actual_keys in record_messages_keys:
                    self.assertSetEqual(expected_keys, actual_keys)


class SalesforceAutomaticFieldsRest(SalesforceAutomaticFields):
    """Test that with no fields selected for a stream automatic fields are still replicated"""

    salesforce_api = 'REST'

    @staticmethod
    def name():
        return "tt_salesforce_auto_rest"

    def test_run(self):
        self.automatic_fields_test()
