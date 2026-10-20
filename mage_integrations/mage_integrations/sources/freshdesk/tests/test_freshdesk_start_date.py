import os

from tap_tester import connections, runner

from base import FreshdeskBaseTest


class FreshdeskStartDateTest(FreshdeskBaseTest):

    start_date_1 = ""
    start_date_2 = ""
    test_streams = {}

    @staticmethod
    def name():
        return "tap_tester_freshdesk_start_date_test"

    def get_properties(self, original: bool = True):
        """Configuration properties required for the tap."""
        return_value = {
            'start_date' : '2019-01-06T00:00:00Z',
        }
        if original:
            return return_value

        return_value["start_date"] = self.start_date
        return return_value

    def test_run(self):
        """Instantiate start date according to the desired data set and run the test"""

        self.start_date_1 = self.get_properties().get('start_date')
        self.start_date_2 = self.timedelta_formatted(self.start_date_1, days=3*365+34)

        self.start_date = self.start_date_1

        # Excluding broken streams: time_settings, satisfaction_ratings
        # TODO spike on the two 403 streams above
        test_streams = {'agents', 'companies', 'groups', 'tickets', 'conversations', 'roles'}
        self.test_streams = test_streams
        obey_start_date_streams = {'agents', 'companies', 'groups', 'roles', 'tickets', 'conversations'}

        ##########################################################################
        ### First Sync
        ##########################################################################

        # instantiate connection
        conn_id_1 = connections.ensure_connection(self)

        # run check mode
        check_job_name_1 = self.run_and_verify_check_mode(conn_id_1)

        # run initial sync
        record_count_by_stream_1 = self.run_and_verify_sync(conn_id_1)
        synced_records_1 = runner.get_records_from_target_output()

        # Update based on sync data
        first_sync_empty = self.test_streams - synced_records_1.keys()
        if len(first_sync_empty) > 0:
            print("Missing stream: {} in sync 1. Failing test for stream(s). Add test data?".format(first_sync_empty))
        self.first_sync_empty = first_sync_empty
        first_sync_bonus = synced_records_1.keys() - self.test_streams
        if len(first_sync_bonus) > 0:
            print("Found stream: {} in first sync. Add to test_streams?".format(first_sync_bonus))

        ##########################################################################
        ### Update START DATE Between Syncs
        ##########################################################################

        print("REPLICATION START DATE CHANGE: {} ===>>> {} ".format(self.start_date, self.start_date_2))
        self.start_date = self.start_date_2

        ##########################################################################
        ### Second Sync
        ##########################################################################

        # create a new connection with the new start_date
        conn_id_2 = connections.ensure_connection(self, original_properties=False)

        # run check mode
        check_job_name_2 = self.run_and_verify_check_mode(conn_id_2)

        # run sync
        record_count_by_stream_2 = self.run_and_verify_sync(conn_id_2)
        synced_records_2 = runner.get_records_from_target_output()

        # Update based on sync data
        second_sync_empty = self.test_streams - synced_records_2.keys()
        if len(second_sync_empty) > 0:
            print("Missing stream(s): {} in sync 2. Updating expectations"\
                  .format(second_sync_empty))
        self.second_sync_empty = second_sync_empty
        second_sync_bonus = synced_records_2.keys() - self.test_streams
        if len(second_sync_bonus) > 0:
            print("Found stream(s): {} in second sync. Add to test_streams?".format(second_sync_bonus))

        for stream in test_streams:
            with self.subTest(stream=stream):

                if stream in self.first_sync_empty:
                    self.assertTrue(False, msg="Stream: {} missing from sync 1".format(stream))

                    continue

                if stream in self.second_sync_empty:
                    if stream == 'roles':
                        self.assertTrue(True, msg="Expected 0 records for stream {}".format(stream))
                        print("No sync 2 data to compare for stream: {}, start_date obeyed".format(stream))

                        continue

                    else:
                        self.assertTrue(False, msg="Sync 2 empty for stream: {}".format(stream))

                        continue

                # expected values
                expected_primary_keys = self.expected_primary_keys()[stream]
                expected_start_date_1 = self.timedelta_formatted(self.start_date_1, days=0)  # Insight buffer format saved
                expected_start_date_2 = self.timedelta_formatted(self.start_date_2, days=0)

                # collect information for assertions from syncs 1 & 2 base on expected values
                record_count_sync_1 = record_count_by_stream_1.get(stream, 0)
                record_count_sync_2 = record_count_by_stream_2.get(stream, 0)
                primary_keys_list_1 = [tuple(message.get('data').get(expected_pk) for expected_pk in expected_primary_keys)
                                       for message in synced_records_1.get(stream).get('messages')
                                       if message.get('action') == 'upsert']
                primary_keys_list_2 = [tuple(message.get('data').get(expected_pk) for expected_pk in expected_primary_keys)
                                       for message in synced_records_2.get(stream).get('messages')
                                       if message.get('action') == 'upsert']
                primary_keys_sync_1 = set(primary_keys_list_1)
                primary_keys_sync_2 = set(primary_keys_list_2)

                if stream in obey_start_date_streams:
                    print("Stream {} obeys start_date".format(stream))
                    # collect information specific to incremental streams from syncs 1 & 2
                    expected_replication_key = next(iter(self.expected_replication_keys().get(stream)))
                    replication_dates_1 =[row.get('data').get(expected_replication_key) for row in
                                          synced_records_1.get(stream, {'messages': []}).get('messages', [])
                                          if row.get('data')]
                    replication_dates_2 =[row.get('data').get(expected_replication_key) for row in
                                          synced_records_2.get(stream, {'messages': []}).get('messages', [])
                                          if row.get('data')]

                    # Verify replication key is greater or equal to start_date for sync 1
                    for replication_date in replication_dates_1:
                        self.assertGreaterEqual(replication_date, expected_start_date_1,
                                msg="Report pertains to a date prior to our start date.\n" +
                                "Sync start_date: {}\n".format(expected_start_date_1) +
                                "Record date: {} ".format(replication_date)
                        )

                    # Verify replication key is greater or equal to start_date for sync 2
                    for replication_date in replication_dates_2:
                        self.assertGreaterEqual(replication_date, expected_start_date_2,
                                msg="Report pertains to a date prior to our start date.\n" +
                                "Sync start_date: {}\n".format(expected_start_date_2) +
                                "Record date: {} ".format(replication_date)
                        )

                    # Verify the number of records replicated in sync 1 is greater than the number
                    # of records replicated in sync 2

                    if stream == 'roles':
                        self.assertEqual(record_count_sync_1, record_count_sync_2)
                    else:
                        self.assertGreater(record_count_sync_1, record_count_sync_2)

                    # Verify the records replicated in sync 2 were also replicated in sync 1
                    self.assertTrue(primary_keys_sync_2.issubset(primary_keys_sync_1))

                # Currently all streams obey start date.  Leaving this in incase one of the two remaining
                # streams are implemented in the future and do not obey start date
                # else:
                #     print("Stream {} does NOT obey start_date".format(stream))
                #     # Verify that the 2nd sync with a later start date replicates the same number of
                #     # records as the 1st sync.
                #     self.assertEqual(record_count_sync_2, record_count_sync_1)

                #     # Verify by primary key the same records are replicated in the 1st and 2nd syncs
                #     self.assertSetEqual(primary_keys_sync_1, primary_keys_sync_2)
