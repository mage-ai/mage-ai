"""
Test that with no fields selected for a stream automatic fields are still replicated
"""
import os

from tap_tester import runner, connections

from base import FacebookBaseTest


class FacebookAutomaticFields(FacebookBaseTest):
    """Test that with no fields selected for a stream automatic fields are still replicated"""

    @staticmethod
    def name():
        return "tap_tester_facebook_automatic_fields"

    def streams_to_test(self):
        return self.expected_streams()

    def get_properties(self, original: bool = True):
        """Configuration properties required for the tap."""
        return_value = {
            'account_id': os.getenv('TAP_FACEBOOK_ACCOUNT_ID'),
            'start_date' : '2021-04-08T00:00:00Z',
            'end_date' : '2021-04-08T00:00:00Z',
            'insights_buffer_days': '1'
        }
        if original:
            return return_value

        return_value["start_date"] = self.start_date
        return return_value


    def test_run(self):
        """
        Verify that for each stream you can get multiple pages of data
        when no fields are selected and only the automatic fields are replicated.

        PREREQUISITE
        For EACH stream add enough data that you surpass the limit of a single
        fetch of data.  For instance if you have a limit of 250 records ensure
        that 251 (or more) records have been posted for that stream.
        """

        expected_streams = self.streams_to_test()

        # instantiate connection
        conn_id = connections.ensure_connection(self)

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
                record_messages_keys = [set(row['data'].keys()) for row in data['messages']]


                # Verify that you get some records for each stream
                self.assertGreater(
                    record_count_by_stream.get(stream, -1), 0,
                    msg="The number of records is not over the stream max limit")

                # Verify that only the automatic fields are sent to the target
                for actual_keys in record_messages_keys:
                    self.assertSetEqual(expected_keys, actual_keys)
