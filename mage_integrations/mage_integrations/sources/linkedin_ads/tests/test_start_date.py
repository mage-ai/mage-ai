from tap_tester import connections, runner

from base import TestLinkedinAdsBase

class LinkedinAdsStartDateTest(TestLinkedinAdsBase):

    start_date_1 = ""
    start_date_2 = ""

    @staticmethod
    def name():
        return "tap_tester_linkedin_ads_start_date_test"

    def test_run(self):
        """Instantiate start date according to the desired data set and run the test"""

        self.start_date_1 = '2018-01-01T00:00:00Z'
        self.start_date_2 = '2019-08-01T00:00:00Z'

        start_date_1_epoch = self.dt_to_ts(self.start_date_1)
        start_date_2_epoch = self.dt_to_ts(self.start_date_2)

        # set start date 1
        self.START_DATE = self.start_date_1

        expected_streams = self.expected_streams()

        ##########################################################################
        ### First Sync
        ##########################################################################

        # instantiate connection
        conn_id_1 = connections.ensure_connection(self, original_properties=False)

        # run check mode
        found_catalogs_1 = self.run_and_verify_check_mode(conn_id_1)

        # table and field selection
        test_catalogs_1_all_fields = [catalog for catalog in found_catalogs_1
                                      if catalog.get('stream_name') in expected_streams]
        self.perform_and_verify_table_and_field_selection(conn_id_1, test_catalogs_1_all_fields, select_all_fields=True)

        # run initial sync
        record_count_by_stream_1 = self.run_and_verify_sync(conn_id_1)
        synced_records_1 = runner.get_records_from_target_output()

        ##########################################################################
        ### Update START DATE Between Syncs
        ##########################################################################

        print("REPLICATION START DATE CHANGE: {} ===>>> {} ".format(self.START_DATE, self.start_date_2))
        # set start date 2
        self.START_DATE = self.start_date_2

        ##########################################################################
        ### Second Sync
        ##########################################################################

        # create a new connection with the new start_date
        conn_id_2 = connections.ensure_connection(self, original_properties=False)

        # run check mode
        found_catalogs_2 = self.run_and_verify_check_mode(conn_id_2)

        # table and field selection
        test_catalogs_2_all_fields = [catalog for catalog in found_catalogs_2
                                      if catalog.get('stream_name') in expected_streams]
        self.perform_and_verify_table_and_field_selection(conn_id_2, test_catalogs_2_all_fields, select_all_fields=True)

        # run sync
        record_count_by_stream_2 = self.run_and_verify_sync(conn_id_2)
        synced_records_2 = runner.get_records_from_target_output()

        # Verify the total number of records replicated in sync 1 is 
        # greater than the number of records replicated in sync 2
        self.assertGreater(sum(record_count_by_stream_1.values()), sum(record_count_by_stream_2.values()))

        for stream in expected_streams:

            # skipping these fields as there is not enough data available
            if stream in ["accounts"]:
                continue

            # checking sync test for "ad_analytics_by_campaign", "ad_analytics_by_creative"
            if stream in ["ad_analytics_by_campaign", "ad_analytics_by_creative"]:
                self.assertGreater(record_count_by_stream_1.get(stream, 0), 0)
                self.assertGreater(record_count_by_stream_2.get(stream, 0), 0)

            with self.subTest(stream=stream):

                # expected values
                expected_primary_keys = self.expected_primary_keys()[stream]
                expected_start_date_keys = self.expected_start_date_keys()[stream]

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

                # Expected bookmark key is one element in set so directly access it
                start_date_keys_list_1 = [message.get('data').get(next(iter(expected_start_date_keys))) for message in synced_records_1.get(stream).get('messages')
                                        if message.get('action') == 'upsert']
                start_date_keys_list_2 = [message.get('data').get(next(iter(expected_start_date_keys))) for message in synced_records_2.get(stream).get('messages')
                                        if message.get('action') == 'upsert']

                start_date_key_sync_1 = set(start_date_keys_list_1)
                start_date_key_sync_2 = set(start_date_keys_list_2)

                # Verify bookmark key values are greater than or equal to start date of sync 1
                for start_date_key_value in start_date_key_sync_1:
                    self.assertGreaterEqual(self.dt_to_ts(start_date_key_value), start_date_1_epoch)

                # Verify bookmark key values are greater than or equal to start date of sync 2
                for start_date_key_value in start_date_key_sync_2:
                    self.assertGreaterEqual(self.dt_to_ts(start_date_key_value), start_date_2_epoch)

                # Verify the number of records replicated in sync 1 is greater than the number
                # of records replicated in sync 2 for stream
                self.assertGreaterEqual(record_count_sync_1, record_count_sync_2)

                # Verify the records replicated in sync 2 were also replicated in sync 1
                self.assertTrue(primary_keys_sync_2.issubset(primary_keys_sync_1))
