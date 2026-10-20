from tap_tester import menagerie, connections, runner
import re

from base import FreshdeskBaseTest

class PaginationTest(FreshdeskBaseTest):

    def name(self):
        return "tap_freshdesk_pagination_test"

    def test_name(self):
        print("Pagination Test for tap-freshdesk")

    def test_run(self):

        # instantiate connection
        conn_id = connections.ensure_connection(self)

        # Add supported streams 1 by 1
        streams_to_test = {'agents', 'tickets'}

        # Run check mode
        # Check mode has no catalog discovery for freshdesk
        check_job_name = self.run_and_verify_check_mode(conn_id)

        # Run sync mode
        sync_record_count = self.run_and_verify_sync(conn_id)
        sync_records = runner.get_records_from_target_output()

        # Test by stream
        for stream in streams_to_test:
            with self.subTest(stream=stream):

                record_count = sync_record_count.get(stream, 0)

                sync_messages = sync_records.get(stream, {'messages': []}).get('messages')

                primary_keys = self.expected_primary_keys().get(stream)

                # Verify the sync meets or exceeds the default record count
                # for streams - conversations, time_entries, satisfaction_ratings, roles, groups,
                # and companies creating test data is a challenge in freshdesk.  These streams will
                # be excluded from this assertion for now
                # Spike created to address this issue : TDL - TODO

                stream_page_size = self.expected_page_limits()[stream]
                self.assertLess(stream_page_size, record_count)
                print("stream_page_size: {} < record_count {} for stream: {}".format(stream_page_size, record_count, stream))

                # Verify there are no duplicates accross pages
                records_pks_set = {tuple([message.get('data').get(primary_key)
                                          for primary_key in primary_keys])
                                   for message in sync_messages}
                records_pks_list = [tuple([message.get('data').get(primary_key)
                                           for primary_key in primary_keys])
                                    for message in sync_messages]

                self.assertCountEqual(records_pks_set, records_pks_list, msg=f"We have duplicate records for {stream}")
