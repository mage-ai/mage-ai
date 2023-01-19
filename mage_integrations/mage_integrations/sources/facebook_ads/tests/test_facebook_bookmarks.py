import os
import datetime
import dateutil.parser
import pytz

from tap_tester import runner, menagerie, connections

from base import FacebookBaseTest


class FacebookBookmarks(FacebookBaseTest):
    @staticmethod
    def name():
        return "tap_tester_facebook_bookmarks"

    def streams_to_test(self):
        return self.expected_streams()

    @staticmethod
    def convert_state_to_utc(date_str):
        """
        Convert a saved bookmark value of the form '2020-08-25T13:17:36-07:00' to
        a string formatted utc datetime,
        in order to compare aginast json formatted datetime values
        """
        date_object = dateutil.parser.parse(date_str)
        date_object_utc = date_object.astimezone(tz=pytz.UTC)
        return datetime.datetime.strftime(date_object_utc, "%Y-%m-%dT%H:%M:%SZ")

    def calculated_states_by_stream(self, current_state):
        """
        Look at the bookmarks from a previous sync and set a new bookmark
        value based off timedelta expectations. This ensures the subsequent sync will replicate
        at least 1 record but, fewer records than the previous sync.

        Sufficient test data is required for this test to cover a given stream.
        An incrmeental replication stream must have at least two records with
        replication keys that differ by more than the lookback window.

        If the test data is changed in the future this will break expectations for this test.

        The following streams barely make the cut:

        campaigns "2021-02-09T18:17:30.000000Z"
                  "2021-02-09T16:24:58.000000Z"

        adsets    "2021-02-09T18:17:41.000000Z"
                  "2021-02-09T17:10:09.000000Z"

        leads     '2021-04-07T20:09:39+0000',
                  '2021-04-07T20:08:27+0000',
        """
        # TODO We want to move this bookmark back by some amount for insgihts streams but
        # cannot do that unless we have at least 3 days of data. Currently we have 2.
        timedelta_by_stream = {stream: [0,0,0]  # {stream_name: [days, hours, minutes], ...}
                               for stream in self.expected_streams()}
        timedelta_by_stream['campaigns'] = [0, 1, 0]
        timedelta_by_stream['adsets'] = [0, 1, 0]
        timedelta_by_stream['leads'] = [0, 0 , 1]

        stream_to_calculated_state = {stream: "" for stream in current_state['bookmarks'].keys()}
        for stream, state in current_state['bookmarks'].items():
            state_key, state_value = next(iter(state.keys())), next(iter(state.values()))
            state_as_datetime = dateutil.parser.parse(state_value)

            days, hours, minutes = timedelta_by_stream[stream]
            calculated_state_as_datetime = state_as_datetime - datetime.timedelta(days=days, hours=hours, minutes=minutes)

            state_format = '%Y-%m-%dT00:00:00+00:00' if self.is_insight(stream) else '%Y-%m-%dT%H:%M:%S-00:00'
            calculated_state_formatted = datetime.datetime.strftime(calculated_state_as_datetime, state_format)

            stream_to_calculated_state[stream] = {state_key: calculated_state_formatted}

        return stream_to_calculated_state

    # function for verifying the date format
    def is_expected_date_format(self, date):
        try:
            # parse date
            datetime.datetime.strptime(date, "%Y-%m-%dT%H:%M:%S.%fZ")
        except ValueError:
            # return False if date is in not expected format
            return False
        # return True in case of no error
        return True

    def test_run(self):
        expected_streams = self.streams_to_test()
        non_insight_streams = {stream for stream in expected_streams if not self.is_insight(stream)}
        insight_streams = {stream for stream in expected_streams if self.is_insight(stream)}

        # Testing against ads insights objects
        self.start_date = self.get_properties()['start_date']
        self.end_date = self.get_properties()['end_date']
        self.bookmarks_test(insight_streams)

        # Testing against core objects
        self.end_date = '2021-02-09T00:00:00Z'
        self.bookmarks_test(non_insight_streams)


    def bookmarks_test(self, expected_streams):
        """A Parametrized Bookmarks Test"""
        expected_replication_keys = self.expected_replication_keys()
        expected_replication_methods = self.expected_replication_method()
        expected_insights_buffer = -1 * int(self.get_properties()['insights_buffer_days'])  # lookback window

        ##########################################################################
        ### First Sync
        ##########################################################################

        conn_id = connections.ensure_connection(self, original_properties=False)

        # Run in check mode
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # Select only the expected streams tables
        catalog_entries = [ce for ce in found_catalogs if ce['tap_stream_id'] in expected_streams]
        self.perform_and_verify_table_and_field_selection(conn_id, catalog_entries, select_all_fields=True)

        # Run a sync job using orchestrator
        first_sync_record_count = self.run_and_verify_sync(conn_id)
        first_sync_records = runner.get_records_from_target_output()
        first_sync_bookmarks = menagerie.get_state(conn_id)

        ##########################################################################
        ### Update State Between Syncs
        ##########################################################################

        new_states = {'bookmarks': dict()}
        simulated_states = self.calculated_states_by_stream(first_sync_bookmarks)
        for stream, new_state in simulated_states.items():
            new_states['bookmarks'][stream] = new_state
        menagerie.set_state(conn_id, new_states)

        ##########################################################################
        ### Second Sync
        ##########################################################################

        second_sync_record_count = self.run_and_verify_sync(conn_id)
        second_sync_records = runner.get_records_from_target_output()
        second_sync_bookmarks = menagerie.get_state(conn_id)

        ##########################################################################
        ### Test By Stream
        ##########################################################################

        for stream in expected_streams:
            with self.subTest(stream=stream):

                # expected values
                expected_replication_method = expected_replication_methods[stream]

                # collect information for assertions from syncs 1 & 2 base on expected values
                first_sync_count = first_sync_record_count.get(stream, 0)
                second_sync_count = second_sync_record_count.get(stream, 0)
                first_sync_messages = [record.get('data') for record in
                                       first_sync_records.get(stream).get('messages')
                                       if record.get('action') == 'upsert']
                second_sync_messages = [record.get('data') for record in
                                        second_sync_records.get(stream).get('messages')
                                        if record.get('action') == 'upsert']
                first_bookmark_key_value = first_sync_bookmarks.get('bookmarks', {stream: None}).get(stream)
                second_bookmark_key_value = second_sync_bookmarks.get('bookmarks', {stream: None}).get(stream)


                if expected_replication_method == self.INCREMENTAL:


                    # collect information specific to incremental streams from syncs 1 & 2
                    replication_key = next(iter(expected_replication_keys[stream]))
                    first_bookmark_value = first_bookmark_key_value.get(replication_key)
                    second_bookmark_value = second_bookmark_key_value.get(replication_key)
                    first_bookmark_value_utc = self.convert_state_to_utc(first_bookmark_value)
                    second_bookmark_value_utc = self.convert_state_to_utc(second_bookmark_value)
                    simulated_bookmark_value = new_states['bookmarks'][stream][replication_key]
                    simulated_bookmark_minus_lookback = self.timedelta_formatted(
                        simulated_bookmark_value, days=expected_insights_buffer,
                        date_format=self.BOOKMARK_COMPARISON_FORMAT
                    ) if self.is_insight(stream) else simulated_bookmark_value


                    # Verify the first sync sets a bookmark of the expected form
                    self.assertIsNotNone(first_bookmark_key_value)
                    self.assertIsNotNone(first_bookmark_key_value.get(replication_key))

                    # Verify the second sync sets a bookmark of the expected form
                    self.assertIsNotNone(second_bookmark_key_value)
                    self.assertIsNotNone(second_bookmark_key_value.get(replication_key))

                    # Verify the second sync bookmark is Equal to the first sync bookmark
                    self.assertEqual(second_bookmark_value, first_bookmark_value) # assumes no changes to data during test


                    for record in second_sync_messages:
                        # for "ads_insights_age_and_gender" and "ads_insights_hourly_advertiser"
                        # verify that the "date_start" and "date_stop" is in expected format
                        if stream in ["ads_insights_age_and_gender", "ads_insights_hourly_advertiser"]:
                            date_start = record.get("date_start")
                            self.assertTrue(self.is_expected_date_format(date_start))
                            date_stop = record.get("date_stop")
                            self.assertTrue(self.is_expected_date_format(date_stop))

                        # Verify the second sync records respect the previous (simulated) bookmark value
                        replication_key_value = record.get(replication_key)
                        self.assertGreaterEqual(replication_key_value, simulated_bookmark_minus_lookback,
                                                msg="Second sync records do not repect the previous bookmark.")

                        # Verify the second sync bookmark value is the max replication key value for a given stream
                        self.assertLessEqual(
                            replication_key_value, second_bookmark_value_utc,
                            msg="Second sync bookmark was set incorrectly, a record with a greater replication-key value was synced."
                        )

                    for record in first_sync_messages:
                        # for "ads_insights_age_and_gender" and "ads_insights_hourly_advertiser"
                        # verify that the "date_start" and "date_stop" is in expected format
                        if stream in ["ads_insights_age_and_gender", "ads_insights_hourly_advertiser"]:
                            date_start = record.get("date_start")
                            self.assertTrue(self.is_expected_date_format(date_start))
                            date_stop = record.get("date_stop")
                            self.assertTrue(self.is_expected_date_format(date_stop))

                        # Verify the first sync bookmark value is the max replication key value for a given stream
                        replication_key_value = record.get(replication_key)
                        self.assertLessEqual(
                            replication_key_value, first_bookmark_value_utc,
                            msg="First sync bookmark was set incorrectly, a record with a greater replication-key value was synced."
                        )


                    # Verify the number of records in the 2nd sync is less then the first
                    self.assertLess(second_sync_count, first_sync_count)


                elif expected_replication_method == self.FULL_TABLE:


                    # Verify the syncs do not set a bookmark for full table streams
                    self.assertIsNone(first_bookmark_key_value)
                    self.assertIsNone(second_bookmark_key_value)

                    # Verify the number of records in the second sync is the same as the first
                    self.assertEqual(second_sync_count, first_sync_count)


                else:


                    raise NotImplementedError(
                        "INVALID EXPECTATIONS\t\tSTREAM: {} REPLICATION_METHOD: {}".format(stream, expected_replication_method)
                    )


                # Verify at least 1 record was replicated in the second sync
                self.assertGreater(second_sync_count, 0, msg="We are not fully testing bookmarking for {}".format(stream))
