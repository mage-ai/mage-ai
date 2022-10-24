import unittest
from tap_tester import runner, menagerie, connections

from base import SalesforceBaseTest


class SalesforceActivateVersionMessages(SalesforceBaseTest):
    @staticmethod
    def name():
        return "tap_tester_salesforce_activate_version_messages"

    @staticmethod
    def expected_sync_streams():
        return {
            'Account',
            'Contact',
            'Lead',
            'Opportunity',
            'User',
        }

    def test_run(self):
        """
        Testing activate version methods are emitted as expected agains incremental
        and full table replication methods.
        1. run with replication_key and no state (incremental)
           - should emit activate version message at beginning
        2. run a second incremental
           - should emit activate version message at beginning
           - version should not change
        3. switch to full table (remove replication_key)
           - should emit activate version message at beginning with new version
        4. start a new full table
           - should emit activate version message at end with new version
        """
        self.salesforce_api = 'BULK'

        conn_id = connections.ensure_connection(self)

        #run in check mode
        found_catalogs = self.run_and_verify_check_mode(conn_id)

        # select streams

        expected_streams = self.expected_sync_streams()
        catalog_entries = [catalog for catalog in found_catalogs
                           if catalog.get('tap_stream_id') in expected_streams]
        self.perform_and_verify_table_and_field_selection(conn_id, catalog_entries, select_all_fields=True)

        # run initial sync (initial incremental)
        streams_replication_methods = {stream: self.INCREMENTAL
                                       for stream in expected_streams}
        self.set_replication_methods(conn_id, catalog_entries, streams_replication_methods)
        menagerie.set_state(conn_id, {}) # clear state
        _ = self.run_and_verify_sync(conn_id)
        initial_incremental_records = runner.get_records_from_target_output()

        # run a second sync (initial full table)
        streams_replication_methods = {stream: self.FULL_TABLE
                                       for stream in expected_streams}
        self.set_replication_methods(conn_id, catalog_entries, streams_replication_methods)
        _ = self.run_and_verify_sync(conn_id)
        initial_full_table_records = runner.get_records_from_target_output()

        # run a third sync (final full talbe)
        _ = self.run_and_verify_sync(conn_id)
        final_full_table_records = runner.get_records_from_target_output()


        # Assertions made by stream
        for stream in expected_streams:
            with self.subTest(stream=stream):

                # Sync 1 (inital incremental)

                initial_incremental_message = initial_incremental_records[stream]['messages'][0]
                incremental_version = initial_incremental_records[stream]['table_version']

                self.assertEqual(initial_incremental_message['action'],
                                 'activate_version',
                                 msg="Expected `activate_version` message to be sent prior to records for incremental sync")

                # Sync 2 (inital full table)

                initial_full_table_message = initial_full_table_records[stream]['messages'][0]
                initial_full_table_version = initial_full_table_records[stream]['table_version']

                self.assertEqual(initial_full_table_message['action'],
                                 'activate_version',
                                 msg="Expected `activate_version` message to be sent prior to records for initial full table sync")

                self.assertNotEqual(initial_full_table_version,
                                    incremental_version,
                                    msg="Expected version for stream Account to be change after switching to full table")

                # Sync 3 (final full table)

                # final_full_table_initial_message = final_full_table_records[stream]['messages'][0]
                final_full_table_final_message = final_full_table_records[stream]['messages'][-1]
                final_full_table_version = final_full_table_records[stream]['table_version']

                self.assertEqual(final_full_table_final_message['action'],
                                 'activate_version',
                                 msg="Expected `activate_version` message to be sent after records for subsequent full table syncs")

                self.assertNotEqual(final_full_table_version,
                                    initial_full_table_version,
                                    msg="Expected version for stream Account to be change after switching to full table")
