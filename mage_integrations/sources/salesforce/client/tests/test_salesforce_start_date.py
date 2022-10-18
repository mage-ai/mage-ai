import unittest
from tap_tester import connections, runner, LOGGER

from base import SalesforceBaseTest


class SalesforceStartDateTest(SalesforceBaseTest):
    """Test that core objects do not obey the start date"""
    start_date_1 = ""
    start_date_2 = ""

    @staticmethod
    def name():
        return "tap_tester_salesforce_start_date_test"

    @staticmethod
    def expected_sync_streams():
        return {
            'Account',  # "2021-11-11T03:50:52.000000Z"
            'Contact',  # "2021-11-11T03:50:52.000000Z"
            'Lead',  # "2021-11-23T11:48:24.000000Z"
            'Opportunity',  # "2021-11-11T03:50:52.000000Z"
            'User',  # "2021-11-23T11:48:24.000000Z"
        }

    def test_run(self):
        """Instantiate start date according to the desired data set and run the test"""
        self.salesforce_api = 'BULK'

        self.assertTrue(self.expected_sync_streams().issubset(self.expected_streams()))

        self.start_date_1 = "2021-11-11T00:00:00Z"
        self.start_date_2 = "2021-12-01T00:00:00Z"

        self.start_date = self.start_date_1

        ##########################################################################
        ### First Sync
        ##########################################################################

        # instantiate connection
        conn_id_1 = connections.ensure_connection(self)

        # run check mode
        found_catalogs_1 = self.run_and_verify_check_mode(conn_id_1)

        # table and field selection
        test_catalogs_1_all_fields = [catalog for catalog in found_catalogs_1
                                      if catalog.get('tap_stream_id') in self.expected_sync_streams()]
        self.perform_and_verify_table_and_field_selection(conn_id_1, test_catalogs_1_all_fields,
                                                    select_all_fields=True)

        # run initial sync
        record_count_by_stream_1 = self.run_and_verify_sync(conn_id_1)
        synced_records_1 = runner.get_records_from_target_output()

        ##########################################################################
        ### Update START DATE Between Sync3s
        ##########################################################################

        LOGGER.info("REPLICATION START DATE CHANGE: %s ===>>> %s", self.start_date, self.start_date_2)
        self.start_date = self.start_date_2

        ##########################################################################
        ### Second Sync
        ##########################################################################

        # create a new connection with the new start_date
        conn_id_2 = connections.ensure_connection(self, original_properties=False)

        # run check mode
        found_catalogs_2 = self.run_and_verify_check_mode(conn_id_2)

        # table and field selection
        test_catalogs_2_all_fields = [catalog for catalog in found_catalogs_2
                                      if catalog.get('tap_stream_id') in self.expected_sync_streams()]
        self.perform_and_verify_table_and_field_selection(conn_id_2, test_catalogs_2_all_fields, select_all_fields=True)

        # run sync
        record_count_by_stream_2 = self.run_and_verify_sync(conn_id_2)

        replicated_row_count_2 = sum(record_count_by_stream_2.values())
        self.assertGreater(replicated_row_count_2, 0, msg="failed to replicate any data")
        LOGGER.info("total replicated row count: %s", replicated_row_count_2)
        synced_records_2 = runner.get_records_from_target_output()

        for stream in self.expected_sync_streams():
            with self.subTest(stream=stream):
                replication_type = self.expected_replication_method().get(stream)

                record_count_1 = record_count_by_stream_1[stream]
                record_count_2 = record_count_by_stream_2[stream]

                # Verify that the 2nd sync with a later start date replicates the same number of
                # records as the 1st sync.
                self.assertEqual(record_count_2, record_count_1)
