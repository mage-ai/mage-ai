import tap_tester.connections as connections
import tap_tester.menagerie   as menagerie
import tap_tester.runner      as runner
from base import ZendeskTest
import unittest
from functools import reduce
from singer import metadata


class ZendeskMinimalSelection(ZendeskTest):
    def name(self):
        return "tap_tester_zendesk_minimal_selection"

    def expected_sync_streams(self):
        return {
            'users'
        }

    def expected_pks(self):
        return {
            'users': {'id'}
        }

    def test_run(self):
        # Default test setup
        # Create the connection for Zendesk
        conn_id = connections.ensure_connection(self)

        # Run a check job using orchestrator
        check_job_name = runner.run_check_mode(self, conn_id)
        exit_status = menagerie.get_exit_status(conn_id, check_job_name)
        menagerie.verify_check_exit_status(self, exit_status, check_job_name)

        # Verify schemas discovered were discovered
        self.found_catalogs = menagerie.get_catalogs(conn_id)
        self.assertEqual(len(self.found_catalogs), len(self.expected_check_streams()))

        # Verify the schemas discovered were exactly what we expect
        found_catalog_names = {catalog['tap_stream_id']
                               for catalog in self.found_catalogs
                               if catalog['tap_stream_id'] in self.expected_check_streams()}
        self.assertSetEqual(self.expected_check_streams(), found_catalog_names)

        # Select our catalogs
        our_catalogs = [c for c in self.found_catalogs if c.get('tap_stream_id') in self.expected_sync_streams()]
        for c in our_catalogs:
            c_annotated = menagerie.get_annotated_schema(conn_id, c['stream_id'])
            c_metadata = metadata.to_map(c_annotated['metadata'])
            # Tags table only has name and count columns; don't select count
            connections.select_catalog_and_fields_via_metadata(conn_id, c, c_annotated, [], ['name'])

        # Clear state before our run
        menagerie.set_state(conn_id, {})

        # Run a sync job using orchestrator
        # Verify exit status is 0 and verify rows were synced
        _ = self.run_and_verify_sync(conn_id)

        # Ensure all records are retrieving the sub set of fields
        records = runner.get_records_from_target_output()
        for stream in self.expected_sync_streams():
            messages = records.get(stream).get('messages')
            for m in messages:
                pk_set = self.expected_pks()[stream]
                for pk in pk_set:
                    self.assertIsNotNone(m.get('data', {}).get(pk), msg="Missing primary-key for message {}".format(m))

