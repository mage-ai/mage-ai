import os

from tap_tester import connections, runner, menagerie

from base import FacebookBaseTest

class FacebookArchivedData(FacebookBaseTest):

    @staticmethod
    def name():
        return "tap_tester_facebook_archived_data"

    def streams_to_test(self):
        """include_deleted is supported for below streams only"""
        return ['ads', 'adsets', 'campaigns']

    def get_properties(self, original: bool = True):
        """Configuration properties required for the tap."""
        return_value = {
            'account_id': os.getenv('TAP_FACEBOOK_ACCOUNT_ID'),
            'start_date' : '2021-10-06T00:00:00Z',
            'end_date' : '2021-10-07T00:00:00Z',
            'insights_buffer_days': '1',
            'include_deleted': 'false'
        }
        if original:
            return return_value

        return_value["include_deleted"] = 'true'
        return return_value

    def test_run(self):
        '''
            Testing the archived data with 'include_deleted' parameter
        '''
        expected_streams = self.streams_to_test()

        ##########################################################################
        ### First Sync with include_deleted = false
        ##########################################################################

        # instantiate connection with the include_deleted = false
        conn_id_1 = connections.ensure_connection(self)

        # run check mode
        found_catalogs_1 = self.run_and_verify_check_mode(conn_id_1)

        # table and field selection
        test_catalogs_1_all_fields = [catalog for catalog in found_catalogs_1
                                      if catalog.get('tap_stream_id') in expected_streams]
        self.perform_and_verify_table_and_field_selection(conn_id_1, test_catalogs_1_all_fields, select_all_fields=True)

        # run initial sync
        record_count_by_stream_1 = self.run_and_verify_sync(conn_id_1)
        synced_records_1 = runner.get_records_from_target_output()

        ##########################################################################
        ### Second Sync with include_deleted = true
        ##########################################################################

        # create a new connection with the include_deleted = true
        conn_id_2 = connections.ensure_connection(self, original_properties=False)

        # run check mode
        found_catalogs_2 = self.run_and_verify_check_mode(conn_id_2)

        # table and field selection
        test_catalogs_2_all_fields = [catalog for catalog in found_catalogs_2
                                      if catalog.get('tap_stream_id') in expected_streams]
        self.perform_and_verify_table_and_field_selection(conn_id_2, test_catalogs_2_all_fields, select_all_fields=True)

        # run sync
        record_count_by_stream_2 = self.run_and_verify_sync(conn_id_2)
        synced_records_2 = runner.get_records_from_target_output()

        for stream in expected_streams:
            with self.subTest(stream=stream):

                # expected primary keys
                expected_primary_keys = self.expected_primary_keys()[stream]

                # collect information about count of records
                record_count_sync_1 = record_count_by_stream_1.get(stream, 0)
                record_count_sync_2 = record_count_by_stream_2.get(stream, 0)

                # collect list and set of primary keys for all the records
                primary_keys_list_1 = [tuple(message.get('data').get(expected_pk) for expected_pk in expected_primary_keys)
                                       for message in synced_records_1.get(stream).get('messages')
                                       if message.get('action') == 'upsert']
                primary_keys_list_2 = [tuple(message.get('data').get(expected_pk) for expected_pk in expected_primary_keys)
                                       for message in synced_records_2.get(stream).get('messages')
                                       if message.get('action') == 'upsert']
                primary_keys_sync_1 = set(primary_keys_list_1)
                primary_keys_sync_2 = set(primary_keys_list_2)

                # collect list of effective_status for all the records
                records_status_sync1 = [message.get('data').get('effective_status')
                                       for message in synced_records_1.get(stream).get('messages')
                                       if message.get('action') == 'upsert']
                records_status_sync2 = [message.get('data').get('effective_status')
                                       for message in synced_records_2.get(stream).get('messages')
                                       if message.get('action') == 'upsert']

                # Verifying that no ARCHIVED records are returned for sync 1
                self.assertNotIn('ARCHIVED', records_status_sync1)

                # Verifying that ARCHIVED records are returned for sync 2
                self.assertIn('ARCHIVED', records_status_sync2)

                # Verify the number of records replicated in sync 2 is greater than the number
                # of records replicated in sync 1
                self.assertGreater(record_count_sync_2, record_count_sync_1)

                # Verify the records replicated in sync 1 were also replicated in sync 2
                self.assertTrue(primary_keys_sync_1.issubset(primary_keys_sync_2))
